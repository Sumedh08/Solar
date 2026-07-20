"""
Solar.ai — unified FastAPI backend (LangGraph agentic architecture).

Endpoints used by the React frontend:
  POST /api/calculator/calculate
  POST /api/prediction/generate
  POST /api/prediction/custom
  POST /api/maintenance/detect
  POST /api/agent          (optional chat / multi-intent)

Legacy aliases kept for compatibility:
  POST /predict/energy, /predict/custom_energy, /predict/defect
"""

from __future__ import annotations

import base64
import logging
import os
from typing import Any, Dict, Optional

from dotenv import load_dotenv
from fastapi import FastAPI, File, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

load_dotenv()

from agent.chat_agent import run_chat
from agent.graph import run_agent
from tools.calculator import calculate_solar_roi
from tools.defect import detect_panel_defect
from tools.grid import forecast_energy

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("solar.ai")

app = FastAPI(
    title="Solar.ai API",
    description="Agentic solar platform: SunCalc · GridSmart · PanelGuard",
    version="2.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# -------------------- models --------------------


class CalculatorRequest(BaseModel):
    system_capacity: float = 3
    module_type: Optional[int] = None
    losses: Optional[float] = None
    array_type: int = 1
    tilt: float = 20
    azimuth: float = 180
    lat: float = 20.5937
    lon: float = 78.9629
    panel_type: str = "mono"
    inverter_type: str = "string"
    structure_type: str = "standard"
    shading_loss: float = 3.0
    annual_consumption: float = 3600
    electricity_rate: float = 8
    upfront_cost: Optional[float] = None
    generation_only: bool = False


class PredictionRequest(BaseModel):
    start_date: str
    end_date: str
    peak_mw: float = 1.0
    lat: float = 20.5937


class AgentRequest(BaseModel):
    message: str = ""
    intent: Optional[str] = None
    calculator_input: Optional[Dict[str, Any]] = None
    grid_input: Optional[Dict[str, Any]] = None


class ChatMessage(BaseModel):
    role: str
    content: str


class ChatRequest(BaseModel):
    message: str
    history: Optional[list[ChatMessage]] = None
    # optional base64 image for PanelGuard via chat
    image_b64: Optional[str] = None
    image_media_type: Optional[str] = "image/jpeg"


# -------------------- health --------------------


@app.get("/")
def health():
    return {
        "status": "healthy",
        "service": "Solar.ai Agentic Backend",
        "architecture": "LangGraph + shared tools",
        "features": {
            "suncalc": "NREL PVWatts + India ROI (no ML)",
            "gridsmart": "lightweight oneshot forecast (no Prophet)",
            "panelguard": "vision LLM: Groq → OpenRouter fallback",
        },
        "env": {
            "groq": bool(os.getenv("GROQ_API_KEY")),
            "openrouter": bool(os.getenv("OPENROUTER_API_KEY")),
            "nrel_key_set": bool(os.getenv("NREL_API_KEY")),
        },
    }


# -------------------- SunCalc --------------------


@app.post("/api/calculator/calculate")
async def api_calculate(body: CalculatorRequest):
    try:
        payload = body.model_dump()
        if payload.get("upfront_cost") is None:
            payload.pop("upfront_cost", None)
        # generation_only default True for step-1 style calls without consumption intent
        # Frontend can send generation_only explicitly; if ROI fields present, full ROI.
        result = await calculate_solar_roi(payload)
        # Shape compatible with old frontend expecting NREL-like {outputs: {ac_annual}}
        return {
            "outputs": result.get("outputs"),
            "losses_applied": result.get("losses_applied"),
            "suggested_upfront_cost_inr": result.get("suggested_upfront_cost_inr"),
            "roi": result.get("roi"),
            "inputs_used": result.get("inputs_used"),
            "station_info": result.get("station_info"),
            "errors": [],
        }
    except Exception as e:
        logger.exception("Calculator error")
        raise HTTPException(status_code=400, detail=str(e)) from e


# -------------------- GridSmart --------------------


@app.post("/api/prediction/generate")
@app.post("/predict/energy")
async def api_predict_energy(body: PredictionRequest):
    try:
        return forecast_energy(
            start_date=body.start_date,
            end_date=body.end_date,
            peak_mw=body.peak_mw,
            lat=body.lat,
        )
    except Exception as e:
        logger.exception("Forecast error")
        raise HTTPException(status_code=400, detail=str(e)) from e


@app.post("/api/prediction/custom")
@app.post("/predict/custom_energy")
async def api_predict_custom(file: UploadFile = File(...)):
    try:
        raw = await file.read()
        return forecast_energy(csv_bytes=raw, horizon_hours=168)
    except Exception as e:
        logger.exception("Custom forecast error")
        raise HTTPException(status_code=400, detail=str(e)) from e


# -------------------- PanelGuard --------------------


@app.post("/api/maintenance/detect")
@app.post("/predict/defect")
async def api_detect_defect(file: UploadFile = File(...)):
    try:
        raw = await file.read()
        if not raw:
            raise HTTPException(status_code=400, detail="Empty file")
        b64 = base64.b64encode(raw).decode("utf-8")
        media = file.content_type or "image/jpeg"
        if media not in ("image/jpeg", "image/png", "image/webp", "image/gif"):
            media = "image/jpeg"
        return detect_panel_defect(b64, media_type=media)
    except HTTPException:
        raise
    except Exception as e:
        logger.exception("Defect error")
        raise HTTPException(status_code=500, detail=str(e)) from e


# -------------------- Agent (LangGraph) --------------------


@app.post("/api/agent")
async def api_agent(body: AgentRequest):
    state: Dict[str, Any] = {
        "messages": [{"role": "user", "content": body.message or ""}],
        "intent": body.intent or "unknown",
        "calculator_input": body.calculator_input or {},
        "grid_input": body.grid_input or {},
        "result": {},
        "error": None,
    }
    try:
        out = await run_agent(state)
        return {
            "intent": out.get("intent"),
            "result": out.get("result"),
            "error": out.get("error"),
            "provider_used": out.get("provider_used"),
        }
    except Exception as e:
        logger.exception("Agent error")
        raise HTTPException(status_code=500, detail=str(e)) from e


@app.post("/api/chat")
async def api_chat(body: ChatRequest):
    """
    Guarded conversational agent (OpenRouter free models + feature tools).
    """
    if not (body.message or "").strip() and not body.image_b64:
        raise HTTPException(status_code=400, detail="message is required")
    history = [{"role": m.role, "content": m.content} for m in (body.history or [])]
    try:
        out = await run_chat(
            message=body.message or "Please analyze this panel image.",
            history=history,
            defect_image_b64=body.image_b64,
            defect_media_type=body.image_media_type or "image/jpeg",
        )
        return out
    except Exception as e:
        logger.exception("Chat error")
        raise HTTPException(status_code=500, detail=str(e)) from e


if __name__ == "__main__":
    import uvicorn

    port = int(os.environ.get("PORT", 5000))
    uvicorn.run("app:app", host="0.0.0.0", port=port, reload=False)
