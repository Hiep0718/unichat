"""Authenticated private diagnostic/probe routes; authoritative metrics live in Core."""

import time
from typing import Annotated, Any

from fastapi import APIRouter, Depends, Query
from fastapi.responses import JSONResponse
from pydantic import BaseModel, ConfigDict, Field, field_validator

from app.core.rag.generation_policy import GenerationPolicy
from app.core.rag.provider_contracts import ProviderFailure, operational_failure_code
from app.core.security import verify_service_jwt
from app.core.service_security import ServiceSecurityError
from app.services.ai_telemetry import telemetry_tracker

router = APIRouter(prefix="/metrics/ai", tags=["ai-metrics"])
ServiceAuth = Annotated[dict[str, Any], Depends(verify_service_jwt)]


class KeyVerifyRequest(BaseModel):
    """A stable registry identity; positional indexes are rejected."""

    model_config = ConfigDict(extra="forbid")
    keyId: str = Field(default="gemini-primary", pattern=r"^[a-zA-Z0-9._-]{1,100}$")


class QuickPromptRequest(KeyVerifyRequest):
    """An explicitly admin-entered prompt, never augmented with private corpus context."""

    prompt: str = Field(min_length=1, max_length=2000)
    model: str | None = Field(default=None, pattern=r"^[a-zA-Z0-9._/-]{1,100}$")

    @field_validator("prompt")
    @classmethod
    def validate_prompt(cls, prompt: str) -> str:
        """Reject blank text before creating an attempt."""
        if not prompt.strip():
            raise ValueError("ADMIN_PROMPT_INVALID")
        return prompt


@router.get("")
def get_ai_metrics(
    _auth: ServiceAuth,
    days: int = Query(default=28, ge=1, le=90),
    keyId: str | None = Query(default=None, pattern=r"^[a-zA-Z0-9._-]{1,100}$"),
    model: str | None = Query(default=None, pattern=r"^[a-zA-Z0-9._/-]{1,100}$"),
) -> dict[str, Any]:
    """Return explicitly partial local diagnostics and actual configured key identities."""
    return telemetry_tracker.get_metrics(days=days, key_id=keyId, model_filter=model)


@router.post("/verify-key", response_model=None)
def verify_gemini_key(
    request: KeyVerifyRequest, _auth: ServiceAuth
) -> dict[str, Any] | JSONResponse:
    """Probe metadata on the selected actual provider credential."""
    policy = GenerationPolicy(str(_auth["requestId"]), None, True, time.time() + 30)
    try:
        return telemetry_tracker.verify_key(key_id=request.keyId, policy=policy)
    except (ServiceSecurityError, ProviderFailure) as error:
        return _failure(error, policy.request_id)


@router.post("/quick-prompt", response_model=None)
def run_quick_prompt(
    request: QuickPromptRequest, _auth: ServiceAuth
) -> dict[str, Any] | JSONResponse:
    """Require signed Core administration request and durable START acknowledgement."""
    policy = GenerationPolicy(str(_auth["requestId"]), None, True, time.time() + 30)
    try:
        return telemetry_tracker.quick_prompt(request.prompt, request.keyId, request.model, policy)
    except (ServiceSecurityError, ProviderFailure) as error:
        return _failure(error, policy.request_id)


def _failure(error: Exception, request_id: str) -> JSONResponse:
    code = operational_failure_code(error)
    return JSONResponse(
        status_code=503, content={"errorCode": code, "requestId": request_id},
        headers={"Retry-After": "30"} if code == "AI_MAINTENANCE" else None,
    )
