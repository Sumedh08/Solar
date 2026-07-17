"""
Solar.ai conversational agent (LangGraph).

Flow:
  guardrail → route intent → tool (optional) → reply (OpenRouter free model)

Tools exposed to chat:
  • suncalc   — ROI / generation estimate
  • gridsmart — energy forecast
  • panelguard — defect guidance (image via API if provided)
"""

from __future__ import annotations

import json
import logging
import re
from datetime import date, timedelta
from typing import Any, Dict, List, Optional

from langgraph.graph import END, StateGraph
from typing_extensions import TypedDict

from agent.guardrails import REJECTION_MESSAGE, check_message_allowed
from agent.llm import openrouter_chat, text_complete
from tools.calculator import calculate_solar_roi
from tools.defect import detect_panel_defect
from tools.grid import forecast_energy

logger = logging.getLogger(__name__)


class ChatState(TypedDict, total=False):
    messages: List[Dict[str, str]]
    user_message: str
    history: List[Dict[str, str]]
    allowed: bool
    intent: str  # suncalc | gridsmart | panelguard | general | reject
    tool_result: Dict[str, Any]
    reply: str
    error: Optional[str]
    provider_used: Optional[str]
    defect_image_b64: Optional[str]
    defect_media_type: Optional[str]


SYSTEM_SOLAR = """You are Solar.ai, a professional assistant for solar energy in India.

You help with:
- Rooftop solar ROI, costs, subsidies (PM Surya Ghar), payback
- Grid / solar generation forecasting
- Solar panel defects and maintenance
- Electricity, tariffs, net metering, renewable energy basics

Rules:
- Stay on solar / electricity / grid topics only.
- Be clear, practical, and concise. Use INR (₹) for money.
- When tool results are provided, ground your answer in those numbers.
- Never invent API keys or claim you ran tools you did not run.
- If data is missing (e.g. location), ask one short clarifying question.
"""


def _last_user(state: ChatState) -> str:
    return (state.get("user_message") or "").strip()


def node_guardrail(state: ChatState) -> Dict[str, Any]:
    msg = _last_user(state)
    check = check_message_allowed(msg, classifier_fn=text_complete)
    if not check["allowed"]:
        return {
            "allowed": False,
            "intent": "reject",
            "reply": check.get("rejection_message") or REJECTION_MESSAGE,
            "provider_used": "guardrail",
        }
    return {"allowed": True}


def _classify_intent(msg: str) -> str:
    t = msg.lower()
    if any(k in t for k in ("defect", "dirty", "dust", "bird drop", "crack", "damage", "panel health", "panelguard", "snow cover")):
        return "panelguard"
    if any(k in t for k in ("forecast", "predict", "gridsmart", "generation curve", "hourly demand", "load forecast", "next week", "next month")):
        return "gridsmart"
    if any(k in t for k in ("roi", "suncalc", "subsidy", "payback", "breakeven", "savings", "install cost", "how much", "kw system", "rooftop cost")):
        return "suncalc"
    # LLM refine
    try:
        raw = text_complete(
            f"Classify into one label: suncalc | gridsmart | panelguard | general\nUser: {msg}",
            system="Reply with only one token: suncalc, gridsmart, panelguard, or general",
            max_tokens=8,
        )
        m = re.search(r"(suncalc|gridsmart|panelguard|general)", (raw or "").lower())
        if m:
            return m.group(1)
    except Exception:
        pass
    return "general"


def node_route(state: ChatState) -> Dict[str, Any]:
    if state.get("intent") == "reject" or state.get("allowed") is False:
        return {}
    if state.get("defect_image_b64"):
        return {"intent": "panelguard"}
    return {"intent": _classify_intent(_last_user(state))}


def _extract_capacity_kw(text: str, default: float = 3.0) -> float:
    m = re.search(r"(\d+(?:\.\d+)?)\s*k[wW]\b", text)
    if m:
        return float(m.group(1))
    m = re.search(r"(\d+(?:\.\d+)?)\s*kilowatt", text.lower())
    if m:
        return float(m.group(1))
    return default


def _extract_lat_lon(text: str):
    # "lat 28.6 lon 77.2" or "28.6, 77.2"
    m = re.search(r"lat(?:itude)?\s*[:=]?\s*(-?\d+(?:\.\d+)?).{0,20}lon(?:gitude)?\s*[:=]?\s*(-?\d+(?:\.\d+)?)", text, re.I)
    if m:
        return float(m.group(1)), float(m.group(2))
    m = re.search(r"(-?\d{1,2}\.\d+)\s*[, ]\s*(-?\d{1,3}\.\d+)", text)
    if m:
        lat, lon = float(m.group(1)), float(m.group(2))
        if -90 <= lat <= 90 and -180 <= lon <= 180:
            return lat, lon
    # city heuristics (India)
    cities = {
        "delhi": (28.6139, 77.2090),
        "mumbai": (19.0760, 72.8777),
        "bangalore": (12.9716, 77.5946),
        "bengaluru": (12.9716, 77.5946),
        "chennai": (13.0827, 80.2707),
        "hyderabad": (17.3850, 78.4867),
        "kolkata": (22.5726, 88.3639),
        "pune": (18.5204, 73.8567),
        "ahmedabad": (23.0225, 72.5714),
        "jaipur": (26.9124, 75.7873),
    }
    tl = text.lower()
    for name, coords in cities.items():
        if name in tl:
            return coords
    return 20.5937, 78.9629  # India centroid default


async def node_suncalc(state: ChatState) -> Dict[str, Any]:
    msg = _last_user(state)
    kw = _extract_capacity_kw(msg)
    lat, lon = _extract_lat_lon(msg)
    rate_m = re.search(r"₹?\s*(\d+(?:\.\d+)?)\s*/?\s*kwh", msg.lower())
    rate = float(rate_m.group(1)) if rate_m else 8.0
    try:
        result = await calculate_solar_roi(
            {
                "system_capacity": kw,
                "lat": lat,
                "lon": lon,
                "panel_type": "mono" if "poly" not in msg.lower() else "poly",
                "electricity_rate": rate,
                "annual_consumption": 1200 * kw,  # rough household heuristic
                "generation_only": False,
            }
        )
        return {"tool_result": result, "error": None, "provider_used": "suncalc_tool"}
    except Exception as e:
        logger.exception("SunCalc tool failed")
        return {"tool_result": {}, "error": str(e)}


async def node_gridsmart(state: ChatState) -> Dict[str, Any]:
    msg = _last_user(state)
    today = date.today()
    # default next 7 days
    start = today.isoformat()
    end = (today + timedelta(days=6)).isoformat()
    m = re.search(r"(\d{4}-\d{2}-\d{2}).{0,20}(\d{4}-\d{2}-\d{2})", msg)
    if m:
        start, end = m.group(1), m.group(2)
    peak_m = re.search(r"(\d+(?:\.\d+)?)\s*mw", msg.lower())
    peak = float(peak_m.group(1)) if peak_m else 1.0
    lat, _ = _extract_lat_lon(msg)
    try:
        result = forecast_energy(start_date=start, end_date=end, peak_mw=peak, lat=lat)
        # Truncate series for LLM context
        fc = result.get("forecast") or []
        summary = {
            "mode": result.get("mode"),
            "model": result.get("model"),
            "points": len(fc),
            "peak_prediction": max((p["prediction"] for p in fc), default=0),
            "avg_prediction": (sum(p["prediction"] for p in fc) / len(fc)) if fc else 0,
            "start": start,
            "end": end,
            "sample": fc[:: max(1, len(fc) // 8)][:8],
            "note": result.get("note"),
        }
        return {"tool_result": summary, "error": None, "provider_used": "gridsmart_tool"}
    except Exception as e:
        logger.exception("GridSmart tool failed")
        return {"tool_result": {}, "error": str(e)}


async def node_panelguard(state: ChatState) -> Dict[str, Any]:
    if state.get("defect_image_b64"):
        try:
            result = detect_panel_defect(
                state["defect_image_b64"],
                media_type=state.get("defect_media_type") or "image/jpeg",
            )
            return {"tool_result": result, "error": None, "provider_used": result.get("provider")}
        except Exception as e:
            logger.exception("PanelGuard vision failed")
            return {"tool_result": {}, "error": str(e)}

    # Guidance without image
    guide = {
        "message": (
            "Upload a clear photo of the solar panel for AI defect classification "
            "(Clean, Bird-drop, Dusty, Electrical-damage, Physical-Damage, Snow-Covered). "
            "You can also use the PanelGuard page in the app."
        ),
        "classes": [
            "Clean",
            "Bird-drop",
            "Dusty",
            "Electrical-damage",
            "Physical-Damage",
            "Snow-Covered",
        ],
    }
    return {"tool_result": guide, "error": None, "provider_used": "panelguard_guide"}


def node_reply(state: ChatState) -> Dict[str, Any]:
    if state.get("intent") == "reject" or state.get("allowed") is False:
        return {
            "reply": state.get("reply") or REJECTION_MESSAGE,
            "provider_used": state.get("provider_used") or "guardrail",
        }

    msg = _last_user(state)
    tool = state.get("tool_result") or {}
    err = state.get("error")
    intent = state.get("intent") or "general"

    history = state.get("history") or []
    hist_txt = ""
    for h in history[-6:]:
        role = h.get("role", "user")
        hist_txt += f"{role}: {h.get('content', '')}\n"

    tool_blob = ""
    if tool:
        try:
            tool_blob = "\n\nTOOL_RESULT (" + intent + "):\n" + json.dumps(tool, default=str)[:3500]
        except Exception:
            tool_blob = f"\n\nTOOL_RESULT: {tool}"
    if err:
        tool_blob += f"\n\nTOOL_ERROR: {err}"

    user_prompt = (
        f"Conversation so far:\n{hist_txt}\n"
        f"User: {msg}\n"
        f"Detected intent: {intent}"
        f"{tool_blob}\n\n"
        "Write a helpful reply for the user."
    )

    try:
        answer, provider, model = openrouter_chat(
            user_prompt,
            system=SYSTEM_SOLAR,
            max_tokens=700,
        )
        if not answer:
            answer = _fallback_reply(intent, tool, err)
        return {
            "reply": answer,
            "provider_used": f"{provider}:{model}" if provider else "fallback",
            "error": None,
        }
    except Exception as e:
        logger.exception("Chat LLM failed")
        return {
            "reply": _fallback_reply(intent, tool, err or str(e)),
            "provider_used": "fallback",
            "error": str(e),
        }


def _fallback_reply(intent: str, tool: Dict[str, Any], err: Optional[str]) -> str:
    if err and not tool:
        return f"I hit a temporary issue running that tool: {err}. Please try again or use the dedicated page."
    if intent == "suncalc" and tool.get("roi"):
        roi = tool["roi"]
        return (
            f"**SunCalc estimate**\n"
            f"- Annual generation: {roi.get('annual_generation_kwh')} kWh\n"
            f"- Subsidy: ₹{roi.get('subsidy_inr')}\n"
            f"- Net cost: ₹{roi.get('net_cost_inr')}\n"
            f"- Annual benefit: ₹{roi.get('total_annual_benefit_inr')}\n"
            f"- Breakeven: {roi.get('breakeven_years')} years\n"
        )
    if intent == "gridsmart" and tool:
        return (
            f"**GridSmart forecast** ({tool.get('start')} → {tool.get('end')})\n"
            f"- Points: {tool.get('points')}\n"
            f"- Peak: {tool.get('peak_prediction')} MW\n"
            f"- Average: {round(float(tool.get('avg_prediction') or 0), 3)} MW\n"
            f"- Model: {tool.get('model')}\n"
        )
    if intent == "panelguard" and tool:
        if tool.get("defect_type"):
            return (
                f"**PanelGuard**\n"
                f"- Class: {tool.get('defect_type')}\n"
                f"- Defective: {tool.get('is_defective')}\n"
                f"- Advice: {tool.get('recommendation')}\n"
            )
        return tool.get("message") or "Use PanelGuard to upload a panel photo."
    return (
        "I can help with solar ROI (SunCalc), generation forecasts (GridSmart), "
        "and panel defects (PanelGuard). What would you like to know?"
    )


def _route_after_guard(state: ChatState) -> str:
    if state.get("allowed") is False or state.get("intent") == "reject":
        return "reject"
    return "route"


def _route_tool(state: ChatState) -> str:
    intent = state.get("intent") or "general"
    if intent == "suncalc":
        return "suncalc"
    if intent == "gridsmart":
        return "gridsmart"
    if intent == "panelguard":
        return "panelguard"
    return "respond"


def build_chat_agent():
    g = StateGraph(ChatState)
    g.add_node("guardrail", node_guardrail)
    g.add_node("route", node_route)
    g.add_node("suncalc", node_suncalc)
    g.add_node("gridsmart", node_gridsmart)
    g.add_node("panelguard", node_panelguard)
    g.add_node("respond", node_reply)
    g.add_node("reject", lambda s: {
        "reply": s.get("reply") or REJECTION_MESSAGE,
        "provider_used": "guardrail",
    })

    g.set_entry_point("guardrail")
    g.add_conditional_edges(
        "guardrail",
        _route_after_guard,
        {"reject": "reject", "route": "route"},
    )
    g.add_conditional_edges(
        "route",
        _route_tool,
        {
            "suncalc": "suncalc",
            "gridsmart": "gridsmart",
            "panelguard": "panelguard",
            "respond": "respond",
        },
    )
    g.add_edge("suncalc", "respond")
    g.add_edge("gridsmart", "respond")
    g.add_edge("panelguard", "respond")
    g.add_edge("respond", END)
    g.add_edge("reject", END)
    return g.compile()


_chat_agent = None


def get_chat_agent():
    global _chat_agent
    if _chat_agent is None:
        _chat_agent = build_chat_agent()
    return _chat_agent


async def run_chat(
    message: str,
    history: Optional[List[Dict[str, str]]] = None,
    defect_image_b64: Optional[str] = None,
    defect_media_type: Optional[str] = None,
) -> Dict[str, Any]:
    agent = get_chat_agent()
    state: ChatState = {
        "user_message": message,
        "history": history or [],
        "messages": [{"role": "user", "content": message}],
        "defect_image_b64": defect_image_b64,
        "defect_media_type": defect_media_type,
        "tool_result": {},
        "reply": "",
        "allowed": True,
    }
    if hasattr(agent, "ainvoke"):
        out = await agent.ainvoke(state)
    else:
        out = agent.invoke(state)
    return {
        "reply": out.get("reply") or REJECTION_MESSAGE,
        "intent": out.get("intent"),
        "allowed": out.get("allowed", True),
        "tool_result": out.get("tool_result") or {},
        "provider_used": out.get("provider_used"),
        "error": out.get("error"),
    }
