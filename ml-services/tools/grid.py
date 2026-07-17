"""
GridSmart — lightweight oneshot energy forecast.

NO heavy Prophet/pickle models (those blow past free Render memory).

Approach (fits free Render, ~few MB):
  • Default mode: physics-inspired solar diurnal profile + mild seasonal envelope
  • Custom CSV mode: oneshot seasonal-hour averages + linear trend (numpy only)

A larger trained model can be plugged in later via FORECAST_MODEL_PATH without
changing the API contract.
"""

from __future__ import annotations

import io
import logging
from datetime import datetime, timedelta
from typing import Any, Dict, List, Optional, Tuple

import numpy as np
import pandas as pd

logger = logging.getLogger(__name__)


def _solar_diurnal_factor(hour: int) -> float:
    """Relative solar generation shape (0 at night, peak ~13:00)."""
    if hour < 6 or hour > 18:
        return 0.0
    # raised cosine-like daytime curve
    x = (hour - 6) / 12.0  # 0..1 over daylight
    return float(np.sin(np.pi * x) ** 1.4)


def _seasonal_envelope(month: int, lat: float = 20.0) -> float:
    """Rough India-centric seasonal multiplier (higher in summer)."""
    # Peak around April–May for much of India; dip monsoon + winter
    month_factors = {
        1: 0.78, 2: 0.88, 3: 1.00, 4: 1.08, 5: 1.05, 6: 0.90,
        7: 0.82, 8: 0.85, 9: 0.92, 10: 0.98, 11: 0.90, 12: 0.80,
    }
    base = month_factors.get(month, 1.0)
    # slight latitude tilt (northern India winter lower)
    lat_adj = 1.0 - max(0.0, (abs(lat) - 15) / 100.0) * (1 if month in (11, 12, 1, 2) else 0)
    return base * lat_adj


def _default_forecast(
    start: datetime,
    end: datetime,
    peak_mw: float = 1.0,
    lat: float = 20.5937,
) -> List[Dict[str, Any]]:
    if end < start:
        raise ValueError("end_date must be on or after start_date")

    hours = int((end - start).total_seconds() // 3600) + 1
    # Cap range for free-tier friendliness
    hours = min(hours, 24 * 31)  # max ~1 month hourly

    out: List[Dict[str, Any]] = []
    for i in range(hours):
        ts = start + timedelta(hours=i)
        diurnal = _solar_diurnal_factor(ts.hour)
        seasonal = _seasonal_envelope(ts.month, lat)
        # tiny deterministic wobble (no RNG so results are stable)
        wobble = 1.0 + 0.03 * np.sin(i / 7.0)
        yhat = max(0.0, peak_mw * diurnal * seasonal * wobble)
        band = max(0.05 * peak_mw, 0.12 * yhat)
        out.append(
            {
                "time": ts.isoformat(),
                "prediction": round(float(yhat), 4),
                "lower_bound": round(float(max(0.0, yhat - band)), 4),
                "upper_bound": round(float(yhat + band), 4),
            }
        )
    return out


def _parse_csv(raw: bytes) -> pd.DataFrame:
    df = pd.read_csv(io.BytesIO(raw))
    # Flexible column mapping
    cols = {c.lower().strip(): c for c in df.columns}
    ds_col = None
    y_col = None
    for cand in ("timestamp", "time", "ds", "datetime", "date"):
        if cand in cols:
            ds_col = cols[cand]
            break
    for cand in ("generation", "value", "y", "power", "mw", "kwh", "output"):
        if cand in cols:
            y_col = cols[cand]
            break
    if ds_col is None or y_col is None:
        if len(df.columns) >= 2:
            ds_col, y_col = df.columns[0], df.columns[1]
        else:
            raise ValueError("CSV needs timestamp + generation columns")

    out = pd.DataFrame(
        {
            "ds": pd.to_datetime(df[ds_col], errors="coerce"),
            "y": pd.to_numeric(df[y_col], errors="coerce"),
        }
    ).dropna()
    out = out.sort_values("ds")
    if len(out) < 24:
        raise ValueError("Need at least 24 rows of historical data for oneshot forecast")
    # keep last 10k points
    if len(out) > 10_000:
        out = out.iloc[-10_000:]
    return out.reset_index(drop=True)


def _oneshot_from_history(
    history: pd.DataFrame,
    horizon_hours: int = 168,
) -> List[Dict[str, Any]]:
    """
    Oneshot model: hour-of-day + day-of-week seasonal means + linear trend.
    Pure numpy/pandas — no training loop, no pickle, free-Render friendly.
    """
    df = history.copy()
    df["hour"] = df["ds"].dt.hour
    df["dow"] = df["ds"].dt.dayofweek
    t0 = df["ds"].min()
    df["t"] = (df["ds"] - t0).dt.total_seconds() / 3600.0

    # Linear trend (robust enough for short horizons)
    t = df["t"].to_numpy(dtype=float)
    y = df["y"].to_numpy(dtype=float)
    if len(t) >= 2 and np.std(t) > 0:
        slope, intercept = np.polyfit(t, y, 1)
    else:
        slope, intercept = 0.0, float(np.mean(y))

    # Residual seasonal tables
    residual = y - (slope * t + intercept)
    df["resid"] = residual
    hour_mean = df.groupby("hour")["resid"].mean().to_dict()
    dow_mean = df.groupby("dow")["resid"].mean().to_dict()
    global_resid = float(np.mean(residual))

    last = df["ds"].max()
    last_t = float(df["t"].iloc[-1])
    resid_std = float(np.std(residual)) if len(residual) > 1 else abs(float(np.mean(y)) * 0.1)

    out: List[Dict[str, Any]] = []
    for h in range(1, horizon_hours + 1):
        ts = last + timedelta(hours=h)
        tt = last_t + h
        base = slope * tt + intercept
        seasonal = hour_mean.get(ts.hour, global_resid) + 0.5 * dow_mean.get(ts.dayofweek, 0.0)
        yhat = max(0.0, base + seasonal)
        band = max(resid_std * 1.2, 0.05 * abs(yhat) + 1e-3)
        out.append(
            {
                "time": ts.isoformat(),
                "prediction": round(float(yhat), 4),
                "lower_bound": round(float(max(0.0, yhat - band)), 4),
                "upper_bound": round(float(yhat + band), 4),
            }
        )
    return out


def forecast_energy(
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    peak_mw: float = 1.0,
    lat: float = 20.5937,
    csv_bytes: Optional[bytes] = None,
    horizon_hours: int = 168,
) -> Dict[str, Any]:
    """
    Unified forecast entrypoint used by REST + LangGraph.
    """
    if csv_bytes:
        history = _parse_csv(csv_bytes)
        forecast = _oneshot_from_history(history, horizon_hours=horizon_hours)
        return {
            "forecast": forecast,
            "mode": "oneshot_csv",
            "model": "seasonal_hour_trend_v1",
            "history_points": len(history),
            "note": (
                "Lightweight oneshot model (no Prophet). "
                "Safe for free Render. A heavier trained model can be added later."
            ),
        }

    if not start_date or not end_date:
        raise ValueError("start_date and end_date are required when no CSV is provided")

    start = datetime.strptime(start_date[:10], "%Y-%m-%d")
    end = datetime.strptime(end_date[:10], "%Y-%m-%d")
    # include full end day
    end = end.replace(hour=23)

    forecast = _default_forecast(start, end, peak_mw=peak_mw, lat=lat)
    return {
        "forecast": forecast,
        "mode": "solar_profile",
        "model": "diurnal_seasonal_v1",
        "peak_mw": peak_mw,
        "note": (
            "Physics-inspired solar profile (no heavy ML). "
            "Upload a CSV for site-specific oneshot forecasting. "
            "Host a trained model later if you need higher accuracy."
        ),
    }
