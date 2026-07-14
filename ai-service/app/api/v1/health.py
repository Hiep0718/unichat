"""Private service health endpoint."""

from typing import Literal

from fastapi import APIRouter
from pydantic import BaseModel

router = APIRouter()


class HealthResponse(BaseModel):
    """Stable health response contract."""

    status: Literal["ok"]
    service: Literal["ai-service"]


@router.get("/health", response_model=HealthResponse)
def get_health() -> HealthResponse:
    """Return the AI Service liveness state."""
    return HealthResponse(status="ok", service="ai-service")