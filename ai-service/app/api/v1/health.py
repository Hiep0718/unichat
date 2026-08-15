"""Private service health endpoints."""

from typing import Literal

from fastapi import APIRouter
from pydantic import BaseModel

from app.services.vector_store import get_chroma_client

router = APIRouter()


class HealthResponse(BaseModel):
    """Stable health response contract."""

    status: Literal["ok"]
    service: Literal["ai-service"]


class ReadinessResponse(BaseModel):
    status: Literal["ok", "degraded"]
    service: Literal["ai-service"]
    chroma_status: str


@router.get("/health", response_model=HealthResponse)
@router.get("/health/live", response_model=HealthResponse)
def get_liveness() -> HealthResponse:
    """Return the AI Service liveness state."""
    return HealthResponse(status="ok", service="ai-service")


@router.get("/health/ready", response_model=ReadinessResponse)
def get_readiness() -> ReadinessResponse:
    """Return the AI Service readiness state checking dependencies."""
    chroma_state = "ok"
    try:
        client = get_chroma_client()
        if client is None:
            chroma_state = "unavailable"
    except Exception:
        chroma_state = "error"

    overall_status = "ok" if chroma_state == "ok" else "degraded"
    return ReadinessResponse(
        status=overall_status,
        service="ai-service",
        chroma_status=chroma_state,
    )