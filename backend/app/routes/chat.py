"""Chat / filtration-suggestion endpoints powered by Gemini."""

from __future__ import annotations

import logging
from typing import Dict, List, Optional

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

from app.services.gemini import chat_message, get_filtration_suggestion

try:
    from google.genai.errors import ClientError as GeminiClientError
except ImportError:
    GeminiClientError = None  # type: ignore

logger = logging.getLogger(__name__)
router = APIRouter()


# ── Request / Response models ────────────────────────────────────────

class FiltrationRequest(BaseModel):
    """The full (or partial) water analysis result object from the frontend."""
    analysis: Dict


class FiltrationResponse(BaseModel):
    suggestion: str


class ChatMessageItem(BaseModel):
    role: str  # "user" | "assistant"
    text: str


class ChatRequest(BaseModel):
    analysis: Dict
    history: List[ChatMessageItem] = Field(default_factory=list)
    message: str


class ChatResponse(BaseModel):
    reply: str


# ── Endpoints ────────────────────────────────────────────────────────

@router.post("/filtration-suggestion", response_model=FiltrationResponse)
def filtration_suggestion(body: FiltrationRequest) -> FiltrationResponse:
    """One-shot filtration recommendation grounded in the water analysis."""
    logger.info("=== /filtration-suggestion hit ===")
    logger.info("  analysis keys: %s", list(body.analysis.keys()))
    try:
        text = get_filtration_suggestion(body.analysis)
        logger.info("  suggestion length: %d chars", len(text))
    except Exception as exc:
        logger.exception("Gemini filtration suggestion failed")
        code = 502
        detail = str(exc)
        if GeminiClientError and isinstance(exc, GeminiClientError) and exc.code == 429:
            code = 429
            detail = "Gemini API rate limit reached. Please wait a moment and try again."
        raise HTTPException(status_code=code, detail=detail) from exc
    return FiltrationResponse(suggestion=text)


@router.post("/message", response_model=ChatResponse)
def chat(body: ChatRequest) -> ChatResponse:
    """Multi-turn chat grounded in the water analysis context."""
    logger.info("=== /message hit ===")
    logger.info("  message: %.80s  history_len: %d", body.message, len(body.history))
    try:
        history = [{"role": m.role, "text": m.text} for m in body.history]
        reply = chat_message(body.analysis, history, body.message)
        logger.info("  reply length: %d chars", len(reply))
    except Exception as exc:
        logger.exception("Gemini chat failed")
        code = 502
        detail = str(exc)
        if GeminiClientError and isinstance(exc, GeminiClientError) and exc.code == 429:
            code = 429
            detail = "Gemini API rate limit reached. Please wait a moment and try again."
        raise HTTPException(status_code=code, detail=detail) from exc
    return ChatResponse(reply=reply)
