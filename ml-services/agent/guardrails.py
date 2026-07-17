"""
Topic guardrails for Solar.ai chat.

Multi-layer (industry pattern):
  1. Fast lexical allow / deny
  2. Optional LLM topic classifier (OpenRouter)
  3. Hard rejection message for out-of-scope asks
"""

from __future__ import annotations

import logging
import re
from typing import Dict, Tuple

logger = logging.getLogger(__name__)

# Clearly in-scope domains for this product
ALLOW_KEYWORDS = (
    "solar", "pv", "photovoltaic", "panel", "rooftop", "inverter", "kw", "kwh",
    "grid", "electricity", "energy", "power", "watt", "mw", "generation",
    "forecast", "predict", "demand", "load", "utility", "net meter", "net-meter",
    "subsidy", "surya", "roi", "savings", "breakeven", "install", "tilt",
    "azimuth", "latitude", "longitude", "nrel", "defect", "dust", "bird",
    "snow", "crack", "damage", "clean", "maintenance", "suncalc", "gridsmart",
    "panelguard", "battery", "storage", "tariff", "bill", "discom", "mnre",
    "renewable", "carbon", "co2", "irradiation", "irradiance", "shading",
    "mono", "poly", "microinverter", "string inverter", "capacity",
    "hello", "hi", "hey", "help", "thanks", "thank you", "what can you",
    "who are you", "features", "about",
)

# Hard deny — jailbreaks / clearly off-topic
DENY_KEYWORDS = (
    "write me a poem about love", "recipe for", "stock tip", "crypto",
    "hack into", "malware", "bomb", "weapon", "nsfw", "porn",
    "ignore previous", "ignore all instructions", "jailbreak",
    "dan mode", "developer mode", "pretend you are not",
)

REJECTION_MESSAGE = (
    "I'm Solar.ai — I only help with **solar energy, electricity, grid forecasting, "
    "rooftop ROI, subsidies, and panel health**.\n\n"
    "Try asking about:\n"
    "• ROI for a 3 kW rooftop system in Delhi\n"
    "• Energy generation forecast for next week\n"
    "• How to check solar panel defects\n"
    "• PM Surya Ghar subsidy amounts"
)


def _normalize(text: str) -> str:
    return re.sub(r"\s+", " ", (text or "").strip().lower())


def lexical_guard(message: str) -> Tuple[str, str]:
    """
    Returns (decision, reason) where decision is allow|reject|uncertain.
    """
    t = _normalize(message)
    if not t or len(t) < 2:
        return "reject", "empty"

    for d in DENY_KEYWORDS:
        if d in t:
            return "reject", f"deny_keyword:{d}"

    # Very short greetings → allow
    if t in ("hi", "hello", "hey", "help", "thanks", "thank you", "yo"):
        return "allow", "greeting"

    hits = sum(1 for k in ALLOW_KEYWORDS if k in t)
    if hits >= 1:
        return "allow", f"allow_hits:{hits}"

    # Numbers + kW-ish patterns even without keywords
    if re.search(r"\d+(\.\d+)?\s*(kw|kwh|mw)", t):
        return "allow", "capacity_pattern"

    return "uncertain", "no_domain_signal"


def llm_topic_guard(message: str, classifier_fn) -> bool:
    """
    True if on-topic. classifier_fn(prompt, system, max_tokens) -> str
    """
    system = (
        "You are a strict topic classifier for Solar.ai. "
        "ALLOWED topics ONLY: solar PV, rooftop solar, electricity bills, energy generation, "
        "power grid forecasting, solar panel defects/maintenance, India solar subsidies, "
        "ROI of solar installs, renewable energy related to solar/electricity. "
        "Reply with exactly one word: ALLOW or REJECT."
    )
    prompt = f"User message:\n{message}\n\nLabel:"
    try:
        raw = (classifier_fn(prompt, system=system, max_tokens=8) or "").strip().upper()
        if "ALLOW" in raw:
            return True
        if "REJECT" in raw:
            return False
    except Exception as e:
        logger.warning("LLM guard failed, defaulting reject on uncertain: %s", e)
    # Fail closed on uncertain when LLM unavailable
    return False


def check_message_allowed(message: str, classifier_fn=None) -> Dict:
    """
    Full guardrail check.
    Returns {allowed: bool, reason: str, rejection_message?: str}
    """
    decision, reason = lexical_guard(message)
    if decision == "allow":
        return {"allowed": True, "reason": reason}
    if decision == "reject":
        return {
            "allowed": False,
            "reason": reason,
            "rejection_message": REJECTION_MESSAGE,
        }

    # uncertain → LLM if available, else reject
    if classifier_fn is not None:
        ok = llm_topic_guard(message, classifier_fn)
        if ok:
            return {"allowed": True, "reason": "llm_allow"}
        return {
            "allowed": False,
            "reason": "llm_reject",
            "rejection_message": REJECTION_MESSAGE,
        }

    return {
        "allowed": False,
        "reason": "uncertain_fail_closed",
        "rejection_message": REJECTION_MESSAGE,
    }
