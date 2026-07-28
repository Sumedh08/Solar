"""
SunCalc — solar generation + India ROI calculator.

Uses NREL PVWatts v8 for physics-based generation estimates, then applies
PM Surya Ghar subsidy and net-metering economics. No ML model required.
"""

from __future__ import annotations

import logging
import os
from typing import Any, Dict

import httpx

logger = logging.getLogger(__name__)

NREL_URL = "https://developer.nrel.gov/api/pvwatts/v8.json"

# Indicative installed cost (₹/kW) — user can override upfront_cost
COST_PER_KW = {
    "mono": 55_000,
    "poly": 45_000,
}
EXTRA_MICRO_INVERTER = 15_000  # ₹/kW
EXTRA_ELEVATED = 10_000  # ₹/kW
EXPORT_RATE_INR = 3.0  # ₹/kWh typical feed-in


def _f(val: Any, default: float = 0.0) -> float:
    try:
        return float(val)
    except (TypeError, ValueError):
        return default


def pm_surya_ghar_subsidy(capacity_kw: float) -> float:
    """
    PM Surya Ghar Muft Bijli Yojana (residential rooftop) caps:
      ≤ 2 kW : ₹30,000 / kW
      2–3 kW : ₹60,000 + ₹18,000 × (kW − 2)
      > 3 kW : ₹78,000 (max)
    """
    kw = max(0.0, capacity_kw)
    if kw <= 0:
        return 0.0
    if kw <= 2:
        return kw * 30_000
    if kw <= 3:
        return 60_000 + (kw - 2) * 18_000
    return 78_000.0


def estimate_upfront_cost(
    capacity_kw: float,
    panel_type: str = "mono",
    inverter_type: str = "string",
    structure_type: str = "standard",
) -> float:
    base = COST_PER_KW.get(panel_type, COST_PER_KW["mono"])
    if inverter_type == "micro":
        base += EXTRA_MICRO_INVERTER
    if structure_type == "elevated":
        base += EXTRA_ELEVATED
    return base * capacity_kw


def compute_system_losses(
    inverter_type: str = "string",
    shading_loss: float = 3.0,
) -> float:
    """Base wiring/dirt/inverter losses + shading heuristic (clamped)."""
    base = 14.0
    if inverter_type == "micro":
        base -= 4.0  # microinverters reduce mismatch/shade loss
    total = base + max(0.0, shading_loss - 3.0)
    return min(max(total, 5.0), 50.0)


def _india_fallback_generation(params: Dict[str, Any]) -> Dict[str, Any]:
    """
    Offline / NREL-down estimate for India rooftop PV.
    Uses typical specific yield ~1400–1600 kWh/kWp·yr adjusted by losses & lat.
    """
    capacity = _f(params.get("system_capacity"), 3)
    losses = _f(params.get("losses"), 14) / 100.0
    lat = abs(_f(params.get("lat"), 20.6))
    module_type = int(_f(params.get("module_type"), 1))
    # Base specific yield (kWh/kW/year) — higher in lower latitudes / mono
    base_yield = 1520 if module_type == 1 else 1420
    lat_factor = max(0.85, 1.05 - (lat - 15) * 0.008)
    ac_annual = capacity * base_yield * lat_factor * (1.0 - losses)
    solrad = 5.2 * lat_factor  # kWh/m²/day-ish average
    return {
        "outputs": {
            "ac_annual": round(ac_annual, 1),
            "solrad_annual": round(solrad, 2),
            "capacity_factor": round((ac_annual / (capacity * 8760)) * 100, 2) if capacity else 0,
        },
        "station_info": {"source": "india_fallback_v1"},
        "errors": [],
        "_fallback": True,
    }


async def fetch_nrel_generation(params: Dict[str, Any]) -> Dict[str, Any]:
    api_key = os.getenv("NREL_API_KEY", "DEMO_KEY")
    query = {
        "api_key": api_key,
        "system_capacity": _f(params.get("system_capacity"), 3),
        "module_type": int(_f(params.get("module_type"), 1)),
        "losses": _f(params.get("losses"), 14),
        "array_type": int(_f(params.get("array_type"), 1)),
        "tilt": _f(params.get("tilt"), 20),
        "azimuth": _f(params.get("azimuth"), 180),
        "lat": _f(params.get("lat"), 20.5937),
        "lon": _f(params.get("lon"), 78.9629),
    }
    try:
        async with httpx.AsyncClient(timeout=45.0) as client:
            resp = await client.get(NREL_URL, params=query)
            resp.raise_for_status()
            data = resp.json()

        if data.get("errors"):
            raise ValueError("; ".join(str(e) for e in data["errors"]))
        if data.get("error"):
            raise ValueError(str(data["error"]))
        if not (data.get("outputs") or {}).get("ac_annual"):
            raise ValueError("NREL returned empty outputs")
        return data
    except Exception as e:
        logger.warning("NREL unavailable (%s) — using India fallback estimate", e)
        return _india_fallback_generation(params)


def compute_roi(
    ac_annual_kwh: float,
    capacity_kw: float,
    annual_consumption: float,
    electricity_rate: float,
    upfront_cost: float,
    panel_type: str = "mono",
) -> Dict[str, Any]:
    subsidy = pm_surya_ghar_subsidy(capacity_kw)
    net_cost = max(0.0, upfront_cost - subsidy)

    self_use = min(ac_annual_kwh, annual_consumption)
    excess = max(0.0, ac_annual_kwh - annual_consumption)
    savings_self = self_use * electricity_rate
    earnings_export = excess * EXPORT_RATE_INR
    annual_benefit = savings_self + earnings_export

    breakeven = (net_cost / annual_benefit) if annual_benefit > 0 else None
    space_sqft = capacity_kw * (70 if panel_type == "mono" else 100)
    roi_25 = (annual_benefit * 25) - net_cost

    return {
        "annual_generation_kwh": round(ac_annual_kwh, 1),
        "self_consumption_kwh": round(self_use, 1),
        "excess_energy_kwh": round(excess, 1),
        "savings_from_self_use_inr": round(savings_self, 0),
        "earnings_from_export_inr": round(earnings_export, 0),
        "total_annual_benefit_inr": round(annual_benefit, 0),
        "upfront_cost_inr": round(upfront_cost, 0),
        "subsidy_inr": round(subsidy, 0),
        "net_cost_inr": round(net_cost, 0),
        "breakeven_years": round(breakeven, 1) if breakeven is not None else None,
        "roi_25_years_inr": round(roi_25, 0),
        "space_required_sqft": round(space_sqft, 0),
        "export_rate_inr_per_kwh": EXPORT_RATE_INR,
    }


async def calculate_solar_roi(payload: Dict[str, Any]) -> Dict[str, Any]:
    """
    Full SunCalc pipeline:
      location/system → NREL generation → India ROI with subsidy.
    """
    capacity = _f(payload.get("system_capacity"), 3)
    panel_type = str(payload.get("panel_type", "mono")).lower()
    inverter_type = str(payload.get("inverter_type", "string")).lower()
    structure_type = str(payload.get("structure_type", "standard")).lower()
    shading_loss = _f(payload.get("shading_loss"), 3.0)

    module_type = 1 if panel_type == "mono" else 0
    losses = compute_system_losses(inverter_type, shading_loss)

    nrel_params = {
        "system_capacity": capacity,
        "module_type": module_type,
        "losses": losses,
        "array_type": int(_f(payload.get("array_type"), 1)),
        "tilt": _f(payload.get("tilt"), 20),
        "azimuth": _f(payload.get("azimuth"), 180),
        "lat": _f(payload.get("lat"), 20.5937),
        "lon": _f(payload.get("lon"), 78.9629),
    }

    nrel = await fetch_nrel_generation(nrel_params)
    outputs = nrel.get("outputs") or {}
    ac_annual = _f(outputs.get("ac_annual"), 0.0)
    if ac_annual <= 0:
        raise ValueError("NREL returned zero annual generation — check lat/lon and capacity.")

    suggested_cost = estimate_upfront_cost(capacity, panel_type, inverter_type, structure_type)
    upfront = _f(payload.get("upfront_cost"), 0.0) or suggested_cost
    annual_consumption = _f(payload.get("annual_consumption"), 3600)
    electricity_rate = _f(payload.get("electricity_rate"), 8)

    # Step-1 only: generation estimate without full ROI
    if payload.get("generation_only"):
        return {
            "outputs": {
                "ac_annual": ac_annual,
                "solrad_annual": outputs.get("solrad_annual"),
                "capacity_factor": outputs.get("capacity_factor"),
            },
            "losses_applied": losses,
            "suggested_upfront_cost_inr": round(suggested_cost, 0),
            "inputs_used": nrel_params,
            "station_info": nrel.get("station_info"),
        }

    roi = compute_roi(
        ac_annual_kwh=ac_annual,
        capacity_kw=capacity,
        annual_consumption=annual_consumption,
        electricity_rate=electricity_rate,
        upfront_cost=upfront,
        panel_type=panel_type,
    )

    return {
        "outputs": {
            "ac_annual": ac_annual,
            "solrad_annual": outputs.get("solrad_annual"),
            "capacity_factor": outputs.get("capacity_factor"),
        },
        "losses_applied": losses,
        "suggested_upfront_cost_inr": round(suggested_cost, 0),
        "roi": roi,
        "inputs_used": nrel_params,
        "station_info": nrel.get("station_info"),
    }
