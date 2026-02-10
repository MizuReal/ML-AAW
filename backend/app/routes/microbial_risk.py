"""API route for microbial-risk assessment."""

from __future__ import annotations

from fastapi import APIRouter, HTTPException

from app.schemas.schemas import (
    MicrobialRiskResponse,
    MicrobialViolationItem,
    WaterSamplePayload,
)
from app.services.microbial_risk import get_microbial_risk_predictor

router = APIRouter()


@router.post("/microbial-risk", response_model=MicrobialRiskResponse)
def assess_microbial_risk(payload: WaterSamplePayload) -> MicrobialRiskResponse:
    """Accept a water sample and return the predicted microbial-risk level
    together with WHO-threshold violations and possible bacteria."""
    predictor = get_microbial_risk_predictor()
    features = payload.feature_dict()
    provided = [v for v in features.values() if v is not None]
    if len(provided) < 2:
        raise HTTPException(
            status_code=400,
            detail="At least two numeric parameters are required for microbial-risk assessment.",
        )
    try:
        result = predictor.predict(features, payload.meta_dict())
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    return MicrobialRiskResponse.model_validate(result)
