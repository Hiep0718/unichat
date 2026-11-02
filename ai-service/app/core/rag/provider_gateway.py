"""Provider selection, durable attempt accounting and Core-owned policy checkpoints."""

import logging
import time
import uuid
from dataclasses import dataclass
from datetime import UTC, datetime
from typing import Any

import httpx
from google.genai import errors

from app.core.provider_settings import ProviderSettings
from app.core.rag.gemini_provider import _gemini, _ollama
from app.core.rag.generation_policy import GenerationPolicy, Purpose, attempt_event
from app.core.rag.hive_provider import generate_hive
from app.core.rag.key_registry import ProviderKey
from app.core.rag.provider_contracts import (
    Cancellation,
    GenerationCancelled,
    Observer,
    ProviderFailure,
    ProviderResult,
    check_cancelled,
)
from app.core.rag.provider_routing import (
    GenerationRouteState,
    ProviderTarget,
    build_provider_route,
)
from app.core.service_security import ServiceSecurityError

logger = logging.getLogger(__name__)

__all__ = [
    "AttemptBudget",
    "Observer",
    "ProviderFailure",
    "ProviderResult",
    "classify_failure",
    "generate",
]


@dataclass
class AttemptBudget(GenerationRouteState):
    """Compatibility name for request-local route state across validation retries."""


def classify_failure(error: Exception) -> ProviderFailure:
    """Classify without exposing upstream body, request credentials or SDK error text."""
    if isinstance(error, ProviderFailure):
        return error
    if isinstance(error, (TimeoutError, httpx.TimeoutException)):
        return ProviderFailure("PROVIDER_TIMEOUT", True)
    if isinstance(error, httpx.NetworkError):
        return ProviderFailure("PROVIDER_NETWORK_ERROR", True)
    if isinstance(error, errors.APIError):
        code = error.code or 0
        return ProviderFailure(f"PROVIDER_HTTP_{code}", code == 429 or 500 <= code <= 599)
    if isinstance(error, httpx.HTTPStatusError):
        code = error.response.status_code
        return ProviderFailure(f"PROVIDER_HTTP_{code}", code == 429 or 500 <= code <= 599)
    return ProviderFailure("PROVIDER_UNAVAILABLE")


def generate(
    prompt: str,
    policy: GenerationPolicy,
    purpose: Purpose = "CHAT",
    observer: Observer | None = None,
    schema: dict[str, Any] | None = None,
    selected_key: ProviderKey | None = None,
    model: str | None = None,
    budget: AttemptBudget | None = None,
    cancelled: Cancellation | None = None,
) -> ProviderResult:
    """Run an exact selected target or the bounded primary/fallback route."""
    check_cancelled(cancelled)
    policy.checkpoint(purpose)
    route_state = budget or AttemptBudget()
    route_state.initialize(build_provider_route(purpose, selected_key, model))
    return _run_route(
        prompt, policy, purpose, route_state, observer, schema, cancelled
    )


def _run_route(
    prompt: str, policy: GenerationPolicy, purpose: Purpose,
    route_state: GenerationRouteState, observer: Observer | None,
    schema: dict[str, Any] | None, cancelled: Cancellation | None,
) -> ProviderResult:
    while True:
        target = route_state.current_target()
        try:
            result = _run_attempt(
                prompt, policy, purpose, target, observer, schema, cancelled
            )
            route_state.pin(target, result)
            return result
        except ProviderFailure as error:
            if not route_state.can_advance(purpose, error):
                raise
            route_state.advance()
            check_cancelled(cancelled)
            if observer:
                observer("reset", {"reason": "PROVIDER_FALLBACK"})


def _run_attempt(
    prompt: str,
    policy: GenerationPolicy,
    purpose: Purpose,
    target: ProviderTarget,
    observer: Observer | None,
    schema: dict[str, Any] | None,
    cancelled: Cancellation | None,
) -> ProviderResult:
    check_cancelled(cancelled)
    attempt_id = str(uuid.uuid4())
    timeout = _attempt_checkpoint(policy, purpose, target, attempt_id)
    event = attempt_event(
        policy, attempt_id, purpose, target.provider,
        target.key_id, target.model, "START",
    )
    policy.record(event)
    started = time.perf_counter()
    try:
        check_cancelled(cancelled)
        timeout = min(timeout, _attempt_checkpoint(policy, purpose, target, attempt_id))
        if observer:
            observer("attempt", {"attemptId": attempt_id, "provider": target.provider})
        result = _invoke(
            prompt, policy, purpose, target, timeout, observer, schema, cancelled
        )
        check_cancelled(cancelled)
        if time.perf_counter() - started >= timeout:
            raise ProviderFailure("PROVIDER_TIMEOUT", True)
        policy.checkpoint(purpose, attempt_id)
    except Exception as error:
        try:
            _record_error(policy, event, started, error)
        except Exception as recording_error:
            if not isinstance(error, (GenerationCancelled, ServiceSecurityError)):
                raise
            logger.error(
                "attempt_end_failed request_id=%s operation_id=%s attempt_id=%s code=%s",
                policy.request_id, policy.operation_id, attempt_id, type(recording_error).__name__,
            )
        raise
    policy.record(
        {
            **event,
            "phase": "END",
            "occurredAt": _timestamp(),
            "outcome": "SUCCESS",
            "latencyMs": int((time.perf_counter() - started) * 1000),
            "inputTokens": result.input_tokens,
            "outputTokens": result.output_tokens,
        }
    )
    check_cancelled(cancelled)
    return result


def _attempt_checkpoint(policy: GenerationPolicy, purpose: Purpose,
                        target: ProviderTarget, attempt_id: str) -> float:
    if target.provider == "hive" and purpose == "CHAT":
        limit = ProviderSettings().hive_chat_attempt_timeout_seconds
        return policy.checkpoint(purpose, attempt_id, limit)
    return policy.checkpoint(purpose, attempt_id)


def _invoke(
    prompt: str,
    policy: GenerationPolicy,
    purpose: Purpose,
    target: ProviderTarget,
    timeout: float,
    observer: Observer | None,
    schema: dict[str, Any] | None,
    cancelled: Cancellation | None,
) -> ProviderResult:
    try:
        if target.key is None:
            return _ollama(prompt, target.model, timeout)
        adapter = generate_hive if target.provider == "hive" else _gemini
        return adapter(
            prompt, target.key, target.model, timeout, observer,
            schema, policy, purpose, cancelled,
        )
    except (GenerationCancelled, ServiceSecurityError, ProviderFailure):
        raise
    except Exception as error:
        if isinstance(error, errors.APIError):
            logger.warning("provider_request_failed request_id=%s provider=%s status=%s reason=%s",
                           policy.request_id, target.provider, error.code, _safe_api_reason(error))
        raise classify_failure(error) from error


def _safe_api_reason(error: errors.APIError) -> str:
    message = str(error.message or "").lower()
    if "api key" in message or "api_key" in message:
        return "API_KEY"
    if "schema" in message or "too many states" in message:
        return "SCHEMA"
    if "billing" in message or "quota" in message:
        return "BILLING_OR_QUOTA"
    if "model" in message and ("not found" in message or "not supported" in message):
        return "MODEL_UNAVAILABLE"
    return "INVALID_REQUEST" if error.code == 400 else "OTHER"


def _record_error(
    policy: GenerationPolicy,
    event: dict[str, Any],
    started: float,
    error: Exception,
) -> None:
    code = (
        str(error)
        if isinstance(error, (GenerationCancelled, ServiceSecurityError))
        else (classify_failure(error).code)
    )
    policy.record(
        {
            **event,
            "phase": "END",
            "occurredAt": _timestamp(),
            "outcome": "ERROR",
            "errorCode": code,
            "latencyMs": int((time.perf_counter() - started) * 1000),
        }
    )


def _timestamp() -> str:
    return datetime.now(UTC).isoformat()
