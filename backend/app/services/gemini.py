"""Thin wrapper around the Google Generative AI SDK (Gemini)."""

from __future__ import annotations

import logging
import os
import time
from pathlib import Path
from typing import Dict, List, Optional

try:
    from dotenv import load_dotenv
    _env_path = Path(__file__).resolve().parents[2] / ".env"  # backend/.env
    load_dotenv(_env_path, override=True)
except ImportError:
    pass  # python-dotenv not installed; rely on OS env

from google import genai
from google.genai import types
from google.genai.errors import ClientError

logger = logging.getLogger(__name__)
logger.info("GEMINI_API_KEY present after dotenv: %s", bool(os.getenv("GEMINI_API_KEY")))

_MODEL = "gemini-2.0-flash"
_MAX_RETRIES = 3
_INITIAL_BACKOFF = 5  # seconds

FILTRATION_SYSTEM_PROMPT = (
    "You are an expert water-treatment engineer. "
    "The user will provide water quality analysis results including microbial risk "
    "level, WHO threshold violations, detected bacteria, and parameter readings. "
    "Your job:\n"
    "1. Recommend the most appropriate WHO-recognised filtration / disinfection "
    "method(s) for the specific contaminants found.\n"
    "2. Briefly explain WHY each method works for those contaminants.\n"
    "3. Note any low-cost alternatives suitable for field or household use.\n"
    "4. If the water is already safe, say so clearly.\n"
    "Keep answers concise (≤200 words). Use bullet points. "
    "Cite WHO guideline names where relevant."
)


_client_instance: Optional[genai.Client] = None


def _get_client() -> genai.Client:
    global _client_instance
    if _client_instance is not None:
        return _client_instance
    api_key = os.getenv("GEMINI_API_KEY", "")
    logger.info("_get_client: GEMINI_API_KEY length=%d", len(api_key))
    if not api_key:
        raise RuntimeError("GEMINI_API_KEY is not set in the environment")
    _client_instance = genai.Client(api_key=api_key)
    return _client_instance


def _call_with_retry(fn, *args, **kwargs):
    """Call *fn* and retry up to _MAX_RETRIES times on 429 rate-limit errors."""
    for attempt in range(_MAX_RETRIES):
        try:
            return fn(*args, **kwargs)
        except ClientError as exc:
            if exc.code == 429 and attempt < _MAX_RETRIES - 1:
                wait = _INITIAL_BACKOFF * (2 ** attempt)
                logger.warning("Gemini 429 rate-limited, retrying in %ds (attempt %d/%d)", wait, attempt + 1, _MAX_RETRIES)
                time.sleep(wait)
            else:
                raise


def _build_water_context(analysis: Dict) -> str:
    """Turn the water analysis dict into a concise text block for the LLM."""
    lines: list[str] = []

    risk = analysis.get("microbialRiskLevel") or analysis.get("microbial_risk_level") or "unknown"
    score = analysis.get("microbialScore") or analysis.get("microbial_score") or "N/A"
    max_score = analysis.get("microbialMaxScore") or analysis.get("microbial_max_score") or 14
    lines.append(f"Microbial risk: {risk} (score {score}/{max_score})")

    violations = analysis.get("microbialViolations") or analysis.get("microbial_violations") or []
    if violations:
        lines.append("WHO threshold violations:")
        for v in violations:
            field = v.get("field", "?")
            rule = v.get("rule", "")
            value = v.get("value")
            unit = v.get("unit", "")
            val_str = f"{value:.2f} {unit}".strip() if value is not None else "N/A"
            health = v.get("healthRisk") or v.get("health_risk") or ""
            bacteria = ", ".join(v.get("bacteria", []))
            lines.append(f"  • {field}: {val_str} — {rule}")
            if health:
                lines.append(f"    Health risk: {health}")
            if bacteria:
                lines.append(f"    Associated bacteria: {bacteria}")

    bacteria_list = analysis.get("possibleBacteria") or analysis.get("possible_bacteria") or []
    if bacteria_list:
        lines.append(f"All possible bacteria: {', '.join(bacteria_list)}")

    # Parameter checks that are not "ok"
    checks = analysis.get("checks") or []
    flagged = [c for c in checks if (c.get("status") or "").lower() not in ("ok", "missing")]
    if flagged:
        lines.append("Flagged water quality parameters:")
        for c in flagged:
            label = c.get("label", c.get("field", "?"))
            status = c.get("status", "?")
            value = c.get("value")
            val_str = f"{value:.2f}" if isinstance(value, (int, float)) else "N/A"
            lines.append(f"  • {label}: {val_str} ({status})")

    potable = analysis.get("isPotable")
    if potable is not None:
        lines.append(f"Potability prediction: {'potable' if potable else 'not potable'}")

    return "\n".join(lines)


def get_filtration_suggestion(analysis: Dict) -> str:
    """One-shot: build context from the analysis and ask Gemini for a filtration recommendation."""
    client = _get_client()
    context = _build_water_context(analysis)

    response = _call_with_retry(
        client.models.generate_content,
        model=_MODEL,
        contents=f"Here is the water quality analysis:\n\n{context}\n\nProvide your filtration recommendation.",
        config=types.GenerateContentConfig(
            system_instruction=FILTRATION_SYSTEM_PROMPT,
            temperature=0.4,
            max_output_tokens=512,
        ),
    )
    return response.text or ""


def chat_message(
    analysis: Dict,
    history: List[Dict[str, str]],
    user_message: str,
) -> str:
    """Continue a multi-turn conversation grounded in the water analysis context."""
    client = _get_client()
    context = _build_water_context(analysis)

    contents: list[types.Content] = []

    # Inject the water context as the first user turn so every reply is grounded
    contents.append(types.Content(
        role="user",
        parts=[types.Part(text=f"Water quality analysis context:\n\n{context}")],
    ))
    contents.append(types.Content(
        role="model",
        parts=[types.Part(text="Understood. I have the water quality context. How can I help?")],
    ))

    # Replay prior conversation
    for msg in history:
        role = "user" if msg.get("role") == "user" else "model"
        contents.append(types.Content(
            role=role,
            parts=[types.Part(text=msg.get("text", ""))],
        ))

    # Append the new user message
    contents.append(types.Content(
        role="user",
        parts=[types.Part(text=user_message)],
    ))

    response = _call_with_retry(
        client.models.generate_content,
        model=_MODEL,
        contents=contents,
        config=types.GenerateContentConfig(
            system_instruction=FILTRATION_SYSTEM_PROMPT,
            temperature=0.5,
            max_output_tokens=512,
        ),
    )
    return response.text or ""
