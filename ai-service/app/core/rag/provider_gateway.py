"""One primary attempt and transient-only fallback with Core policy checkpoints."""

import os
import time
import uuid
from collections.abc import Callable
from dataclasses import dataclass
from datetime import UTC
from typing import Any

import httpx
from google import genai
from google.genai import errors, types

from app.core.rag.generation_policy import GenerationPolicy, Purpose, attempt_event
from app.core.rag.key_registry import ProviderKey, configured_keys, configured_model

Observer = Callable[[str, dict[str, Any]], None]
MAX_OUTPUT_CHARACTERS = 80000


class ProviderFailure(RuntimeError):
    """Safe provider failure classification without exposing SDK request contents."""

    def __init__(self, code: str, transient: bool = False) -> None:
        super().__init__(code)
        self.code = code
        self.transient = transient


@dataclass(frozen=True)
class ProviderResult:
    """Actual provider result; absent token measurements stay unknown."""

    text: str
    provider: str
    model: str
    key_id: str
    input_tokens: int | None = None
    output_tokens: int | None = None


@dataclass
class AttemptBudget:
    """Request-local budget shared across validation retries, never authorization state."""

    fallback_used: bool = False


def classify_failure(error: Exception) -> ProviderFailure:
    """Only timeouts, HTTP 429 and HTTP 5xx qualify for fallback."""
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


def generate(
    prompt: str,
    policy: GenerationPolicy,
    purpose: Purpose = "CHAT",
    observer: Observer | None = None,
    schema: dict[str, Any] | None = None,
    selected_key: ProviderKey | None = None,
    model: str | None = None,
    budget: AttemptBudget | None = None,
) -> ProviderResult:
    """Run one configured primary and at most one explicitly enabled fallback."""
    policy.checkpoint(purpose)
    keys = configured_keys()
    key = selected_key or (keys[0] if keys else None)
    if key is None:
        raise ProviderFailure("PROVIDER_UNCONFIGURED")
    target_model = model or configured_model()
    attempt_budget = budget or AttemptBudget()
    try:
        return _run_attempt(prompt, policy, purpose, key, target_model, observer, schema)
    except ProviderFailure as error:
        if not error.transient or os.getenv("ENABLE_OLLAMA_FALLBACK", "false").lower() != "true":
            raise
        if purpose != "CHAT" or attempt_budget.fallback_used:
            raise
        attempt_budget.fallback_used = True
        if observer:
            observer("reset", {"reason": "PROVIDER_FALLBACK"})
        return _run_attempt(
            prompt, policy, purpose, None, os.getenv("OLLAMA_MODEL", "llama3"), observer, schema
        )


def _run_attempt(
    prompt: str,
    policy: GenerationPolicy,
    purpose: Purpose,
    key: ProviderKey | None,
    model: str,
    observer: Observer | None,
    schema: dict[str, Any] | None,
) -> ProviderResult:
    attempt_id = str(uuid.uuid4())
    timeout = policy.checkpoint(purpose, attempt_id)
    provider, key_id = ("gemini", key.key_id) if key else ("ollama", "ollama-local")
    event = attempt_event(policy, attempt_id, purpose, provider, key_id, model, "START")
    policy.record(event)
    started = time.perf_counter()
    if observer:
        observer("attempt", {"attemptId": attempt_id, "provider": provider})
    try:
        result = (
            _gemini(prompt, key, model, timeout, observer, schema, policy, purpose)
            if key
            else _ollama(prompt, model, timeout)
        )
        if time.perf_counter() - started >= timeout:
            raise ProviderFailure("PROVIDER_TIMEOUT", True)
    except Exception as error:
        failure = classify_failure(error)
        policy.record(
            {
                **event,
                "phase": "END",
                "occurredAt": _timestamp(),
                "outcome": "ERROR",
                "errorCode": failure.code,
                "latencyMs": int((time.perf_counter() - started) * 1000),
            }
        )
        if isinstance(error, ProviderFailure):
            raise
        from app.core.service_security import ServiceSecurityError

        if isinstance(error, ServiceSecurityError):
            raise
        raise failure from error
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
    policy.checkpoint(purpose, attempt_id)
    return result


def _gemini(
    prompt: str,
    key: ProviderKey,
    model: str,
    timeout: float,
    observer: Observer | None,
    schema: dict[str, Any] | None,
    policy: GenerationPolicy,
    purpose: Purpose,
) -> ProviderResult:
    configuration = types.GenerateContentConfig(temperature=0.2, max_output_tokens=8192)
    attempt_deadline = time.monotonic() + timeout
    if schema is not None:
        configuration.response_mime_type = "application/json"
        configuration.response_json_schema = schema
    with genai.Client(
        api_key=key.secret, http_options=types.HttpOptions(timeout=int(timeout * 1000))
    ) as client:
        if observer is None:
            response = client.models.generate_content(
                model=model, contents=prompt, config=configuration
            )
            return _response_result(response, model, key.key_id)
        parts: list[str] = []
        last_response: types.GenerateContentResponse | None = None
        for streamed_response in client.models.generate_content_stream(
            model=model, contents=prompt, config=configuration
        ):
            if time.monotonic() >= attempt_deadline:
                raise ProviderFailure("PROVIDER_TIMEOUT", True)
            policy.checkpoint(purpose)
            last_response = streamed_response
            delta = streamed_response.text or ""
            parts.append(delta)
            if sum(map(len, parts)) > MAX_OUTPUT_CHARACTERS:
                raise ProviderFailure("OUTPUT_LIMIT_EXCEEDED")
            observer("raw", {"delta": delta})
        if last_response is None:
            raise ProviderFailure("PROVIDER_EMPTY_RESPONSE")
        result = _response_result(last_response, model, key.key_id)
        return ProviderResult(
            "".join(parts), "gemini", model, key.key_id, result.input_tokens, result.output_tokens
        )


def _response_result(response: Any, model: str, key_id: str) -> ProviderResult:
    text = response.text or ""
    if not text.strip() and not getattr(response, "usage_metadata", None):
        raise ProviderFailure("PROVIDER_EMPTY_OR_BLOCKED_RESPONSE")
    if len(text) > MAX_OUTPUT_CHARACTERS:
        raise ProviderFailure("OUTPUT_LIMIT_EXCEEDED")
    usage = response.usage_metadata
    return ProviderResult(
        text,
        "gemini",
        model,
        key_id,
        usage.prompt_token_count if usage else None,
        usage.candidates_token_count if usage else None,
    )


def _ollama(prompt: str, model: str, timeout: float) -> ProviderResult:
    host = os.getenv("OLLAMA_HOST", "http://localhost:11434").rstrip("/")
    with httpx.Client(timeout=timeout, follow_redirects=False) as client:
        response = client.post(
            f"{host}/api/generate",
            json={
                "model": model,
                "prompt": prompt,
                "stream": False,
                "format": "json",
            },
        )
        response.raise_for_status()
        data = response.json()
    text = str(data.get("response", ""))
    if len(text) > MAX_OUTPUT_CHARACTERS or not text.strip():
        raise ProviderFailure("PROVIDER_EMPTY_OR_OVERSIZED_RESPONSE")
    return ProviderResult(
        text, "ollama", model, "ollama-local", data.get("prompt_eval_count"), data.get("eval_count")
    )


def _timestamp() -> str:
    from datetime import datetime

    return datetime.now(UTC).isoformat()
