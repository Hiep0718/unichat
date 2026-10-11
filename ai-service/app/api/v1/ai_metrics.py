"""Authenticated private diagnostic/probe routes; authoritative metrics live in Core."""

import time
from typing import Annotated, Any

from fastapi import APIRouter, Depends, Query
from pydantic import BaseModel, ConfigDict, Field

from app.core.rag.generation_policy import GenerationPolicy
from app.core.security import verify_service_jwt
from app.services.ai_telemetry import telemetry_tracker

router = APIRouter(prefix="/metrics/ai", tags=["ai-metrics"])
ServiceAuth = Annotated[dict[str, Any], Depends(verify_service_jwt)]


class KeyVerifyRequest(BaseModel):
    """A stable registry identity; positional indexes are rejected."""

    model_config = ConfigDict(extra="forbid")
    keyId: str = Field(default="gemini-primary", pattern=r"^[a-zA-Z0-9._-]{1,100}$")


class QuickPromptRequest(KeyVerifyRequest):
    """An explicitly admin-entered prompt, never augmented with private corpus context."""

    prompt: str = Field(min_length=1, max_length=1000)
    model: str | None = Field(default=None, pattern=r"^[a-zA-Z0-9._-]{1,100}$")


@router.get("")
def get_ai_metrics(
    _auth: ServiceAuth,
    days: int = Query(default=28, ge=1, le=90),
    keyId: str | None = Query(default=None, pattern=r"^[a-zA-Z0-9._-]{1,100}$"),
    model: str | None = Query(default=None, pattern=r"^[a-zA-Z0-9._-]{1,100}$"),
) -> dict[str, Any]:
    """Return explicitly partial local diagnostics and actual configured key identities."""
    return telemetry_tracker.get_metrics(days=days, key_id=keyId, model_filter=model)


@router.post("/verify-key")
def verify_gemini_key(request: KeyVerifyRequest, _auth: ServiceAuth) -> dict[str, Any]:
    """Probe metadata on the selected actual provider credential."""
    policy = GenerationPolicy(str(_auth["requestId"]), None, True, time.time() + 30)
    return telemetry_tracker.verify_key(key_id=request.keyId, policy=policy)


@router.post("/quick-prompt")
def run_quick_prompt(request: QuickPromptRequest, _auth: ServiceAuth) -> dict[str, Any]:
    """Require signed Core administration request and durable START acknowledgement."""
    policy = GenerationPolicy(str(_auth["requestId"]), None, True, time.time() + 30)
    return telemetry_tracker.quick_prompt(request.prompt, request.keyId, request.model, policy)
