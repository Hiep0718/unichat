"""Private service health endpoints."""

from typing import Literal

from fastapi import APIRouter
from pydantic import BaseModel, ValidationError

from app.core.rag.key_registry import active_provider, configured_keys, configured_model
from app.services.vector_store import get_chroma_client

router = APIRouter()


class HealthResponse(BaseModel):
    """Stable health response contract."""

    status: Literal["ok"]
    service: Literal["ai-service"]


class ReadinessResponse(BaseModel):
    """Local dependency/configuration readiness; this does not claim provider authentication."""

    status: Literal["ok", "degraded"]
    service: Literal["ai-service"]
    chroma_status: str
    provider_status: str
    active_provider: str | None
    active_model: str | None


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

    provider_state, provider, model = _provider_readiness()
    overall_status = "ok" if chroma_state == "ok" and provider_state == "configured" else "degraded"
    return ReadinessResponse(
        status=overall_status,
        service="ai-service",
        chroma_status=chroma_state,
        provider_status=provider_state,
        active_provider=provider,
        active_model=model,
    )


def _provider_readiness() -> tuple[str, str | None, str | None]:
    try:
        provider, model = active_provider(), configured_model()
        configured = any(key.provider == provider for key in configured_keys())
        return "configured" if configured else "unconfigured", provider, model
    except ValidationError:
        return "invalid_configuration", None, None
