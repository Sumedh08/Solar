"""
LangGraph agent for Solar.ai.

One shared graph routes work to feature tools — no separate ML model per feature:
  • calculator → NREL + India ROI math
  • defect     → shared vision LLM (Groq → OpenRouter)
  • grid       → lightweight oneshot forecast
  • chat       → short text answer about solar.ai
"""

from __future__ import annotations

import logging
import re
from typing import Any, Dict, Optional

from langgraph.graph import END, StateGraph

from agent.llm import text_complete
from agent.state import SolarState
from tools.calculator import calculate_solar_roi
from tools.defect import detect_panel_defect
from tools.grid import forecast_energy

logger = logging.getLogger(__name__)


def _rule_intent(text: str) -> str:
    t = (text or "").lower()
    if any(k in t for k in ("defect", "panel", "dirty", "dust", "crack", "damage", "bird")):
        return "defect"
    if any(k in t for k in ("forecast", "grid", "predict", "demand", "generation", "load")):
        return "grid"
    if any(k in t for k in ("roi", "calculator", "suncalc", "subsidy", "savings", "install", "kw")):
        return "calculator"
    return "chat"


async def classify_intent(state: SolarState) -> Dict[str, Any]:
    if state.get("intent") and state["intent"] != "unknown":
        return {}

    # Prefer explicit payload keys
    if state.get("defect_image_b64"):
        return {"intent": "defect"}
    if state.get("calculator_input"):
        return {"intent": "calculator"}
    if state.get("grid_input"):
        return {"intent": "grid"}

    msgs = state.get("messages") or []
    last = msgs[-1]["content"] if msgs else ""
    intent = _rule_intent(last)

    # Optional LLM refine when ambiguous
    if intent == "chat" and last.strip():
        try:
            reply = text_complete(
                f"Classify this user request into one word: calculator, defect, grid, or chat.\nUser: {last}",
                system="Reply with only one label: calculator|defect|grid|chat",
                max_tokens=8,
            )
            m = re.search(r"(calculator|defect|grid|chat)", (reply or "").lower())
            if m:
                intent = m.group(1)
        except Exception as e:
            logger.debug("Intent LLM skipped: %s", e)

    return {"intent": intent}


async def node_calculator(state: SolarState) -> Dict[str, Any]:
    payload = dict(state.get("calculator_input") or {})
    # Pull simple numbers from last message if payload empty
    if not payload and state.get("messages"):
        text = state["messages"][-1]["content"]
        m = re.search(r"(\d+(?:\.\d+)?)\s*k[wW]", text)
        if m:
            payload["system_capacity"] = float(m.group(1))
        payload.setdefault("generation_only", False)
    try:
        result = await calculate_solar_roi(payload)
        return {"result": result, "error": None, "provider_used": "nrel+roi"}
    except Exception as e:
        logger.exception("Calculator failed")
        return {"error": str(e), "result": {}}


async def node_defect(state: SolarState) -> Dict[str, Any]:
    image_b64 = state.get("defect_image_b64")
    if not image_b64:
        return {
            "error": "No panel image provided. Upload an image for defect analysis.",
            "result": {},
        }
    try:
        result = detect_panel_defect(image_b64)
        return {
            "result": result,
            "error": None,
            "provider_used": result.get("provider"),
        }
    except Exception as e:
        logger.exception("Defect detection failed")
        return {"error": str(e), "result": {}}


async def node_grid(state: SolarState) -> Dict[str, Any]:
    gi = state.get("grid_input") or {}
    try:
        result = forecast_energy(
            start_date=gi.get("start_date"),
            end_date=gi.get("end_date"),
            peak_mw=float(gi.get("peak_mw") or 1.0),
            lat=float(gi.get("lat") or 20.5937),
            csv_bytes=gi.get("csv_bytes"),
            horizon_hours=int(gi.get("horizon_hours") or 168),
        )
        return {"result": result, "error": None, "provider_used": result.get("model")}
    except Exception as e:
        logger.exception("Grid forecast failed")
        return {"error": str(e), "result": {}}


async def node_chat(state: SolarState) -> Dict[str, Any]:
    msgs = state.get("messages") or []
    last = msgs[-1]["content"] if msgs else "Hello"
    system = (
        "You are Solar.ai assistant for India rooftop solar. "
        "You help with ROI (SunCalc), panel defects (PanelGuard), "
        "and generation forecasting (GridSmart). Be concise and practical."
    )
    try:
        answer = text_complete(last, system=system, max_tokens=400)
        if not answer:
            answer = (
                "Solar.ai offers: SunCalc (ROI), GridSmart (forecast), PanelGuard (defects). "
                "Use the product pages or ask a specific question."
            )
        return {"result": {"reply": answer}, "error": None, "provider_used": "llm"}
    except Exception as e:
        return {"error": str(e), "result": {}}


def _route(state: SolarState) -> str:
    intent = state.get("intent") or "chat"
    if intent in ("calculator", "defect", "grid", "chat"):
        return intent
    return "chat"


def build_solar_agent():
    g = StateGraph(SolarState)
    g.add_node("classify", classify_intent)
    g.add_node("calculator", node_calculator)
    g.add_node("defect", node_defect)
    g.add_node("grid", node_grid)
    g.add_node("chat", node_chat)

    g.set_entry_point("classify")
    g.add_conditional_edges(
        "classify",
        _route,
        {
            "calculator": "calculator",
            "defect": "defect",
            "grid": "grid",
            "chat": "chat",
        },
    )
    g.add_edge("calculator", END)
    g.add_edge("defect", END)
    g.add_edge("grid", END)
    g.add_edge("chat", END)
    return g.compile()


_agent = None


def get_agent():
    global _agent
    if _agent is None:
        _agent = build_solar_agent()
    return _agent


async def run_agent(state: Dict[str, Any]) -> Dict[str, Any]:
    agent = get_agent()
    # langgraph async invoke
    if hasattr(agent, "ainvoke"):
        return await agent.ainvoke(state)
    return agent.invoke(state)
