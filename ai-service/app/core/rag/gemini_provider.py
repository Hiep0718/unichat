"""Legacy Gemini and explicit transient Ollama rollback transport adapters."""

import os
import time
from typing import Any

import httpx
from google import genai
from google.genai import types

from app.core.rag.generation_policy import GenerationPolicy, Purpose
from app.core.rag.key_registry import ProviderKey
from app.core.rag.provider_contracts import (
    MAX_OUTPUT_CHARACTERS,
    Cancellation,
    Observer,
    ProviderFailure,
    ProviderResult,
    check_cancelled,
)


def _gemini(
    prompt: str,
    key: ProviderKey,
    model: str,
    timeout: float,
    observer: Observer | None,
    schema: dict[str, Any] | None,
    policy: GenerationPolicy,
    purpose: Purpose,
    cancelled: Cancellation | None = None,
) -> ProviderResult:
    check_cancelled(cancelled)
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
            check_cancelled(cancelled)
            return _response_result(response, model, key.key_id)
        parts: list[str] = []
        last_response: types.GenerateContentResponse | None = None
        for streamed_response in client.models.generate_content_stream(
            model=model, contents=prompt, config=configuration
        ):
            check_cancelled(cancelled)
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
