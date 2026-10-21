"""Provider selection, durable attempt accounting and Core-owned policy checkpoints."""

import logging
import os
import time
import uuid
from dataclasses import dataclass
from datetime import UTC, datetime
from typing import Any

import httpx
from google.genai import errors
from pydantic import ValidationError

from app.core.rag.gemini_provider import _gemini, _ollama
from app.core.rag.generation_policy import GenerationPolicy, Purpose, attempt_event
from app.core.rag.hive_provider import generate_hive
from app.core.rag.key_registry import (
    ProviderKey,
    active_provider,
    configured_keys,
    configured_model,
)
from app.core.rag.provider_contracts import (
    Cancellation,
    GenerationCancelled,
    Observer,
    ProviderFailure,
    ProviderResult,
    check_cancelled,
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
class AttemptBudget:
    """Request-local fallback budget shared across validation retries."""

    fallback_used: bool = False


def classify_failure(error: Exception) -> ProviderFailure:
    """Classify without exposing upstream body, request credentials or SDK error text."""
    if isinstance(error, ProviderFailure):
        return error
    if isinstance(error, (TimeoutError, httpx.TimeoutException)):
        return ProviderFailure("PROVIDER_TIMEOUT", True)
    if isinstance(error, errors.APIError):
        code = error.code or 0
        return ProviderFailure(f"PROVIDER_HTTP_{code}", code == 429 or 500 <= code <= 599)
    if isinstance(error, httpx.HTTPStatusError):
        code = error.response.status_code
        return ProviderFailure(f"PROVIDER_HTTP_{code}", code == 429 or 500 <= code <= 599)
    return ProviderFailure("PROVIDER_UNAVAILABLE")


def _selection(selected_key: ProviderKey | None, model: str | None) -> tuple[ProviderKey, str]:
    try:
        provider = active_provider()
        keys = [key for key in configured_keys() if key.provider == provider]
        key = selected_key or (keys[0] if keys else None)
        target_model = model or configured_model()
    except ValidationError as error:
        raise ProviderFailure("PROVIDER_UNCONFIGURED") from error
    if key is None:
        raise ProviderFailure("PROVIDER_UNCONFIGURED")
    if key.provider != provider or target_model != configured_model(provider):
        raise ProviderFailure("PROVIDER_SELECTION_INVALID")
    if selected_key is not None and selected_key not in keys:
        raise ProviderFailure("PROVIDER_KEY_UNKNOWN")
    return key, target_model


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
    """Run one selected provider; Hive never falls back to another key/model/provider."""
    check_cancelled(cancelled)
    policy.checkpoint(purpose)
    key, target_model = _selection(selected_key, model)
    attempt_budget = budget or AttemptBudget()
    try:
        return _run_attempt(prompt, policy, purpose, key, target_model, observer, schema, cancelled)
    except ProviderFailure as error:
        if not _fallback_allowed(key, purpose, error, attempt_budget):
            raise
        attempt_budget.fallback_used = True
        check_cancelled(cancelled)
        if observer:
            observer("reset", {"reason": "PROVIDER_FALLBACK"})
        return _run_attempt(
            prompt,
            policy,
            purpose,
            None,
            os.getenv("OLLAMA_MODEL", "llama3"),
            observer,
            schema,
            cancelled,
        )


def _fallback_allowed(
    key: ProviderKey,
    purpose: Purpose,
    error: ProviderFailure,
    budget: AttemptBudget,
) -> bool:
    return (
        key.provider == "gemini"
        and error.transient
        and purpose == "CHAT"
        and not budget.fallback_used
        and os.getenv("ENABLE_OLLAMA_FALLBACK", "false").lower() == "true"
    )


def _run_attempt(
    prompt: str,
    policy: GenerationPolicy,
    purpose: Purpose,
    key: ProviderKey | None,
    model: str,
    observer: Observer | None,
    schema: dict[str, Any] | None,
    cancelled: Cancellation | None,
) -> ProviderResult:
    check_cancelled(cancelled)
    attempt_id = str(uuid.uuid4())
    timeout = policy.checkpoint(purpose, attempt_id)
    provider, key_id = (key.provider, key.key_id) if key else ("ollama", "ollama-local")
    event = attempt_event(policy, attempt_id, purpose, provider, key_id, model, "START")
    policy.record(event)
    started = time.perf_counter()
    try:
        check_cancelled(cancelled)
        timeout = min(timeout, policy.checkpoint(purpose, attempt_id))
        if observer:
            observer("attempt", {"attemptId": attempt_id, "provider": provider})
        result = _invoke(prompt, policy, purpose, key, model, timeout, observer, schema, cancelled)
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


def _invoke(
    prompt: str,
    policy: GenerationPolicy,
    purpose: Purpose,
    key: ProviderKey | None,
    model: str,
    timeout: float,
    observer: Observer | None,
    schema: dict[str, Any] | None,
    cancelled: Cancellation | None,
) -> ProviderResult:
    try:
        if key is None:
            return _ollama(prompt, model, timeout)
        adapter = generate_hive if key.provider == "hive" else _gemini
        return adapter(prompt, key, model, timeout, observer, schema, policy, purpose, cancelled)
    except (GenerationCancelled, ServiceSecurityError, ProviderFailure):
        raise
    except Exception as error:
        raise classify_failure(error) from error


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
