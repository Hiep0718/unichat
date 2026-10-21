"""One streaming Hive HTTPX attempt; policy and durable accounting live in the gateway."""

import time
from typing import Any

import httpx

from app.core.provider_settings import ProviderSettings
from app.core.rag.generation_policy import GenerationPolicy, Purpose
from app.core.rag.hive_sse import HiveCompletion, SseParser
from app.core.rag.key_registry import ProviderKey
from app.core.rag.provider_contracts import (
    Cancellation,
    Observer,
    ProviderFailure,
    ProviderResult,
    check_cancelled,
)


def _request_body(prompt: str, model: str, structured: bool, probe: bool) -> dict[str, Any]:
    config = ProviderSettings()
    body: dict[str, Any] = {
        "model": model,
        "messages": [{"role": "user", "content": prompt}],
        "stream": True,
        "max_completion_tokens": 128 if probe else config.hive_max_tokens,
        "temperature": config.hive_temperature,
        "top_p": config.hive_top_p,
        "reasoning_effort": "none" if probe else config.hive_reasoning_effort,
    }
    if structured:
        body["response_format"] = {"type": "json_object"}
    return body


def generate_hive(
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
    """Consume raw SSE for every Hive call, including aggregate calls and key probes."""
    config = ProviderSettings()
    deadline = time.monotonic() + timeout
    limits = httpx.Timeout(
        min(timeout, 5), read=min(timeout, config.hive_read_idle_timeout_seconds)
    )
    headers = {
        "Authorization": f"Bearer {key.secret}",
        "Accept": "text/event-stream",
        "Accept-Encoding": "identity",
    }
    check_cancelled(cancelled)
    with httpx.Client(timeout=limits, follow_redirects=False) as client:
        with client.stream(
            "POST",
            f"{config.hive_base_url.rstrip('/')}/chat/completions",
            headers=headers,
            json=_request_body(prompt, model, schema is not None, purpose == "KEY_PROBE"),
        ) as response:
            response.raise_for_status()
            if ("text/event-stream" not in response.headers.get("content-type", "").lower()
                    or response.headers.get("content-encoding", "identity").lower() != "identity"):
                raise ProviderFailure("PROVIDER_PROTOCOL_ERROR")
            completion = _consume(response, deadline, observer, policy, purpose, cancelled, model)
    return ProviderResult(
        completion.text(),
        "hive",
        model,
        key.key_id,
        completion.input_tokens,
        completion.output_tokens,
    )


def _consume(
    response: httpx.Response,
    deadline: float,
    observer: Observer | None,
    policy: GenerationPolicy,
    purpose: Purpose,
    cancelled: Cancellation | None,
    model: str,
) -> HiveCompletion:
    parser, completion = SseParser(), HiveCompletion(model)
    last_checkpoint = time.monotonic()
    for chunk in response.iter_raw(chunk_size=None):
        _check_attempt(deadline, cancelled)
        for offset in range(0, len(chunk), 16384):
            for event in parser.feed(chunk[offset : offset + 16384]):
                delta = completion.accept(event)
                if delta:
                    _check_attempt(deadline, cancelled)
                    if observer:
                        observer("raw", {"delta": delta})
        if time.monotonic() - last_checkpoint >= 1:
            policy.checkpoint(purpose)
            _check_attempt(deadline, cancelled)
            last_checkpoint = time.monotonic()
        if completion.done:
            return completion
    parser.feed(b"", final=True)
    completion.text()
    return completion


def _check_attempt(deadline: float, cancelled: Cancellation | None) -> None:
    check_cancelled(cancelled)
    if time.monotonic() >= deadline:
        raise ProviderFailure("PROVIDER_TIMEOUT", True)
