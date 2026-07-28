"""
PanelGuard — solar panel defect classification via vision LLM.

Uses a single shared vision path (Groq → OpenRouter). No local CNN/YOLO.
"""

from __future__ import annotations

import logging
from typing import Any, Dict, Optional

from agent.llm import vision_classify

logger = logging.getLogger(__name__)

VALID_CLASSES = (
    "Clean",
    "Bird-drop",
    "Dusty",
    "Electrical-damage",
    "Physical-Damage",
    "Snow-Covered",
)

RECOMMENDATIONS = {
    "Bird-drop": "Schedule cleaning to remove bird droppings and restore efficiency.",
    "Dusty": "Panel cleaning recommended to improve energy output.",
    "Snow-Covered": "Remove snow carefully or wait for natural melting.",
    "Electrical-damage": "URGENT: Contact a certified solar technician for inspection and repair.",
    "Physical-Damage": "URGENT: Contact a certified solar technician for inspection and repair.",
    "Clean": "Panel is in good condition. Continue routine monitoring.",
    "Unknown": "Unable to classify confidently. Retake a clear, well-lit photo of the panel surface.",
}

PROMPT = """You are an expert solar panel inspector AI.
Analyze this image of a solar panel and classify its condition into EXACTLY ONE of:
- Clean
- Bird-drop
- Dusty
- Electrical-damage
- Physical-Damage
- Snow-Covered

Respond with ONLY the category name, nothing else."""


def _parse_class(text: str) -> str:
    lower = (text or "").lower().strip()
    for cls in VALID_CLASSES:
        if cls.lower() in lower:
            return cls
    # common aliases
    aliases = {
        "bird": "Bird-drop",
        "droppings": "Bird-drop",
        "dust": "Dusty",
        "dirt": "Dusty",
        "soiling": "Dusty",
        "crack": "Physical-Damage",
        "broken": "Physical-Damage",
        "physical": "Physical-Damage",
        "electrical": "Electrical-damage",
        "burn": "Electrical-damage",
        "hotspot": "Electrical-damage",
        "snow": "Snow-Covered",
        "ice": "Snow-Covered",
        "clean": "Clean",
        "normal": "Clean",
        "healthy": "Clean",
        "good": "Clean",
    }
    for key, cls in aliases.items():
        if key in lower:
            return cls
    return "Unknown"


def detect_panel_defect(
    image_b64: str,
    media_type: str = "image/jpeg",
) -> Dict[str, Any]:
    raw = vision_classify(PROMPT, image_b64, media_type=media_type, max_tokens=32)
    defect_type = _parse_class(raw["text"])
    is_defective = defect_type not in ("Clean", "Unknown")
    confidence = 0.92 if defect_type != "Unknown" else 0.4

    return {
        "is_defective": is_defective,
        "defect_type": defect_type,
        "confidence": confidence,
        "recommendation": RECOMMENDATIONS.get(defect_type, RECOMMENDATIONS["Unknown"]),
        "provider": raw["provider"],
        "model": raw["model"],
        "raw_response": raw["text"],
    }
