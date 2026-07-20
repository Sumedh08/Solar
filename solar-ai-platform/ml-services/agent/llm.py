"""
LLM client helpers.

Defect vision:
  1) Groq (primary, free tier, long-lived vision model)
  2) OpenRouter (fallback if Groq fails)

Chat routing uses the same Groq text path when available.
No separate ML model per feature — one vision LLM + one lightweight grid math engine.
"""

from __future__ import annotations

import logging
import os
from typing import Any, Dict, List, Optional

from openai import OpenAI

logger = logging.getLogger(__name__)

# Long-lived free / generous-tier vision models
GROQ_VISION_MODEL = os.getenv(
    "GROQ_VISION_MODEL", "meta-llama/llama-4-scout-17b-16e-instruct"
)
OPENROUTER_VISION_MODEL = os.getenv(
    "OPENROUTER_VISION_MODEL", "google/gemma-3-27b-it:free"
)
GROQ_TEXT_MODEL = os.getenv("GROQ_TEXT_MODEL", "llama-3.3-70b-versatile")

# Chat uses OpenRouter free models (primary + fallback)
OPENROUTER_CHAT_MODEL = os.getenv(
    "OPENROUTER_CHAT_MODEL", "meta-llama/llama-3.3-70b-instruct:free"
)
OPENROUTER_CHAT_FALLBACK = os.getenv(
    "OPENROUTER_CHAT_FALLBACK", "google/gemma-3-27b-it:free"
)


def _groq_client() -> Optional[OpenAI]:
    key = os.getenv("GROQ_API_KEY")
    if not key or key.startswith("placeholder"):
        return None
    return OpenAI(api_key=key, base_url="https://api.groq.com/openai/v1")


def _openrouter_client() -> Optional[OpenAI]:
    key = os.getenv("OPENROUTER_API_KEY")
    if not key or key.startswith("placeholder"):
        return None
    return OpenAI(
        api_key=key,
        base_url="https://openrouter.ai/api/v1",
        default_headers={
            "HTTP-Referer": "https://solar.ai",
            "X-Title": "Solar.ai",
        },
    )


def openrouter_chat(
    prompt: str,
    system: str = "",
    max_tokens: int = 700,
    temperature: float = 0.35,
) -> tuple:
    """
    Chat completion via OpenRouter free models.
    Returns (text, provider, model).
    """
    messages: List[Dict[str, str]] = []
    if system:
        messages.append({"role": "system", "content": system})
    messages.append({"role": "user", "content": prompt})

    client = _openrouter_client()
    if client is None:
        # Soft fallback to Groq text if OpenRouter key missing
        groq = _groq_client()
        if groq is None:
            raise RuntimeError(
                "Set OPENROUTER_API_KEY for chat (or GROQ_API_KEY as fallback)."
            )
        resp = groq.chat.completions.create(
            model=GROQ_TEXT_MODEL,
            messages=messages,
            temperature=temperature,
            max_tokens=max_tokens,
        )
        text = (resp.choices[0].message.content or "").strip()
        return text, "groq", GROQ_TEXT_MODEL

    last_err: Optional[Exception] = None
    for model in (OPENROUTER_CHAT_MODEL, OPENROUTER_CHAT_FALLBACK):
        try:
            resp = client.chat.completions.create(
                model=model,
                messages=messages,
                temperature=temperature,
                max_tokens=max_tokens,
            )
            text = (resp.choices[0].message.content or "").strip()
            logger.info("Chat via OpenRouter (%s)", model)
            return text, "openrouter", model
        except Exception as e:
            last_err = e
            logger.warning("OpenRouter model %s failed: %s", model, e)

    # Last resort: Groq
    groq = _groq_client()
    if groq is not None:
        try:
            resp = groq.chat.completions.create(
                model=GROQ_TEXT_MODEL,
                messages=messages,
                temperature=temperature,
                max_tokens=max_tokens,
            )
            text = (resp.choices[0].message.content or "").strip()
            return text, "groq", GROQ_TEXT_MODEL
        except Exception as e:
            last_err = e

    raise RuntimeError(f"Chat LLM unavailable: {last_err}")


def vision_classify(
    prompt: str,
    image_b64: str,
    media_type: str = "image/jpeg",
    max_tokens: int = 64,
) -> Dict[str, Any]:
    """
    Classify an image with Groq first, then OpenRouter on failure.
    Returns {text, provider, model}.
    """
    data_url = f"data:{media_type};base64,{image_b64}"
    messages: List[Dict[str, Any]] = [
        {
            "role": "user",
            "content": [
                {"type": "text", "text": prompt},
                {"type": "image_url", "image_url": {"url": data_url}},
            ],
        }
    ]

    # --- Primary: Groq ---
    groq = _groq_client()
    if groq is not None:
        try:
            resp = groq.chat.completions.create(
                model=GROQ_VISION_MODEL,
                messages=messages,
                temperature=0.1,
                max_tokens=max_tokens,
            )
            text = (resp.choices[0].message.content or "").strip()
            logger.info("Vision via Groq (%s): %s", GROQ_VISION_MODEL, text[:120])
            return {"text": text, "provider": "groq", "model": GROQ_VISION_MODEL}
        except Exception as e:
            logger.warning("Groq vision failed, falling back to OpenRouter: %s", e)
    else:
        logger.warning("GROQ_API_KEY missing — trying OpenRouter")

    # --- Fallback: OpenRouter ---
    or_client = _openrouter_client()
    if or_client is None:
        raise RuntimeError(
            "Both Groq and OpenRouter are unavailable. "
            "Set GROQ_API_KEY and/or OPENROUTER_API_KEY."
        )

    resp = or_client.chat.completions.create(
        model=OPENROUTER_VISION_MODEL,
        messages=messages,
        temperature=0.1,
        max_tokens=max_tokens,
    )
    text = (resp.choices[0].message.content or "").strip()
    logger.info("Vision via OpenRouter (%s): %s", OPENROUTER_VISION_MODEL, text[:120])
    return {"text": text, "provider": "openrouter", "model": OPENROUTER_VISION_MODEL}


def text_complete(prompt: str, system: str = "", max_tokens: int = 256) -> str:
    """Lightweight text completion for intent routing / summaries (Groq → OpenRouter)."""
    messages: List[Dict[str, str]] = []
    if system:
        messages.append({"role": "system", "content": system})
    messages.append({"role": "user", "content": prompt})

    groq = _groq_client()
    if groq is not None:
        try:
            resp = groq.chat.completions.create(
                model=GROQ_TEXT_MODEL,
                messages=messages,
                temperature=0.2,
                max_tokens=max_tokens,
            )
            return (resp.choices[0].message.content or "").strip()
        except Exception as e:
            logger.warning("Groq text failed: %s", e)

    or_client = _openrouter_client()
    if or_client is None:
        return ""
    resp = or_client.chat.completions.create(
        model="meta-llama/llama-3.3-70b-instruct:free",
        messages=messages,
        temperature=0.2,
        max_tokens=max_tokens,
    )
    return (resp.choices[0].message.content or "").strip()
