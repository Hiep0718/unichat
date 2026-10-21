"""Offline raw HTTPX attempt contracts, deadlines, cleanup and fail-closed selection."""

import json
from collections.abc import Iterable
from typing import Any
from unittest.mock import Mock, patch

import httpx
import pytest

from app.core.rag.generation_policy import Purpose
from app.core.rag.hive_provider import generate_hive
from app.core.rag.key_registry import ProviderKey
from app.core.rag.provider_contracts import GenerationCancelled, ProviderFailure, ProviderResult
from app.core.rag.provider_gateway import generate
from app.core.service_security import ServiceSecurityError
from app.tests.test_llm_provider_fallback import fake_policy

KEY = ProviderKey("hive-primary", "HIVE_API_KEY", "offline-fixture", "hive")
MODEL = "deepseek-ai/deepseek-v4.1-flash-1017"


def wire(content: str = "Tiếng Việt") -> bytes:
    """Build one complete raw response with measured token counts."""
    return ("data: " + json.dumps({"choices": [{"delta": {"content": content},
            "finish_reason": "stop"}], "usage": {"prompt_tokens": 2,
            "completion_tokens": 3}}, ensure_ascii=False) + "\n\ndata: [DONE]\n\n").encode()


def transport(chunks: Iterable[bytes]) -> tuple[Mock, Mock, Mock]:
    """Mock context managers while preserving real status and header validation."""
    client = Mock()
    response = Mock()
    response.headers = {"content-type": "text/event-stream; charset=utf-8"}
    response.iter_raw.return_value = iter(chunks)
    client.__enter__ = Mock(return_value=client)
    client.__exit__ = Mock(return_value=False)
    context = Mock()
    context.__enter__ = Mock(return_value=response)
    context.__exit__ = Mock(return_value=False)
    client.stream.return_value = context
    return client, response, context


@pytest.mark.parametrize("purpose,schema", [("CHAT", {}), ("COMPACTION", None),
                                           ("KEY_PROBE", None)])
def test_should_always_stream_raw_identity_and_close_resources(
    monkeypatch: pytest.MonkeyPatch, purpose: Purpose, schema: dict[str, Any] | None,
) -> None:
    monkeypatch.setenv("HIVE_API_KEY", KEY.secret)
    client, response, context = transport([wire()[:19], wire()[19:]])
    policy, events = fake_policy(), []
    with patch("app.core.rag.hive_provider.httpx.Client", return_value=client) as factory:
        result = generate_hive("prompt", KEY, MODEL, 30, lambda kind, data: events.append(data),
                               schema, policy, purpose)
    assert result.text == "Tiếng Việt" and result.provider == "hive"
    assert (result.input_tokens, result.output_tokens) == (2, 3)
    response.iter_raw.assert_called_once_with(chunk_size=None)
    body = client.stream.call_args.kwargs["json"]
    headers = client.stream.call_args.kwargs["headers"]
    assert client.stream.call_args.args == (
        "POST", "https://api-cdn.thehive.ai/api/v3/chat/completions"
    )
    assert headers["Authorization"] == f"Bearer {KEY.secret}"
    assert headers["Accept-Encoding"] == "identity"
    assert body["model"] == MODEL
    assert body["stream"] is True and "stream_options" not in body
    assert body["max_completion_tokens"] == (128 if purpose == "KEY_PROBE" else 4096)
    assert "max_tokens" not in body
    assert body["reasoning_effort"] == ("none" if purpose == "KEY_PROBE" else "low")
    assert ("response_format" in body) is (schema is not None)
    assert factory.call_args.kwargs["timeout"].read == 5
    assert events == [{"delta": "Tiếng Việt"}]
    assert context.__exit__.called and client.__exit__.called


@pytest.mark.parametrize("failure", [httpx.ReadTimeout("private-upstream"),
    ProviderFailure("PROVIDER_PROTOCOL_ERROR"), ServiceSecurityError("CORE_POLICY_DENIED"),
    GenerationCancelled("GENERATION_CANCELLED")])
def test_should_close_raw_stream_when_read_or_policy_fails(failure: Exception) -> None:
    client, response, context = transport([])
    response.iter_raw.side_effect = failure
    with patch("app.core.rag.hive_provider.httpx.Client", return_value=client):
        with pytest.raises(type(failure)):
            generate_hive("prompt", KEY, MODEL, 30, None, None, fake_policy(), "CHAT")
    assert context.__exit__.called and client.__exit__.called


def test_should_reject_non_sse_and_truncated_eof() -> None:
    client, response, _ = transport([b'data: {"choices":[]}\n\n'])
    with patch("app.core.rag.hive_provider.httpx.Client", return_value=client):
        with pytest.raises(ProviderFailure, match="TRUNCATED"):
            generate_hive("prompt", KEY, MODEL, 30, None, None, fake_policy(), "CHAT")
        response.headers = {"content-type": "application/json"}
        with pytest.raises(ProviderFailure, match="PROTOCOL"):
            generate_hive("prompt", KEY, MODEL, 30, None, None, fake_policy(), "CHAT")


def test_should_checkpoint_reasoning_only_raw_chunks_and_stop_slow_drip() -> None:
    reasoning = b'data: {"choices":[{"delta":{"reasoning_content":"hidden"}}]}\n\n'
    client, _, _ = transport([reasoning, reasoning, wire()])
    policy = fake_policy()
    with patch("app.core.rag.hive_provider.httpx.Client", return_value=client):
        with patch("app.core.rag.hive_provider.time.monotonic", side_effect=[0, 0, 1.1, 1.2, 1.3, 1.4, 31]):
            with pytest.raises(ProviderFailure, match="TIMEOUT"):
                generate_hive("prompt", KEY, MODEL, 30, None, None, policy, "CHAT")
    assert policy.checkpoint.call_count >= 1


@pytest.mark.parametrize("failure", [ProviderFailure("PROVIDER_TIMEOUT", True),
    ProviderFailure("PROVIDER_HTTP_429", True), ProviderFailure("PROVIDER_HTTP_401"),
    ProviderFailure("PROVIDER_PROTOCOL_ERROR"), GenerationCancelled("GENERATION_CANCELLED"),
    ServiceSecurityError("CORE_POLICY_DENIED")])
def test_should_never_fallback_or_reclassify_cancellation_for_hive(
    monkeypatch: pytest.MonkeyPatch, failure: Exception,
) -> None:
    monkeypatch.setenv("LLM_PROVIDER", "hive")
    monkeypatch.setenv("HIVE_API_KEY", KEY.secret)
    monkeypatch.setenv("ENABLE_OLLAMA_FALLBACK", "true")
    with patch("app.core.rag.provider_gateway.generate_hive", side_effect=failure):
        with patch("app.core.rag.provider_gateway._gemini") as gemini:
            with patch("app.core.rag.provider_gateway._ollama") as ollama:
                with pytest.raises(type(failure)):
                    generate("prompt", fake_policy())
    gemini.assert_not_called()
    ollama.assert_not_called()


@pytest.mark.parametrize("selection", ["missing", "wrong_provider", "wrong_model", "unknown_key"])
def test_should_reject_invalid_selection_before_provider_network(
    monkeypatch: pytest.MonkeyPatch, selection: str,
) -> None:
    monkeypatch.setenv("LLM_PROVIDER", "hive")
    if selection != "missing":
        monkeypatch.setenv("HIVE_API_KEY", KEY.secret)
    selected = ProviderKey("gemini-primary", "name", "other", "gemini") if selection == "wrong_provider" else None
    if selection == "unknown_key":
        selected = ProviderKey("hive-unknown", "name", "other", "hive")
    with patch("app.core.rag.provider_gateway.generate_hive") as upstream:
        with pytest.raises(ProviderFailure):
            generate("prompt", fake_policy(), selected_key=selected,
                     model="wrong" if selection == "wrong_model" else None)
    upstream.assert_not_called()


@pytest.mark.parametrize("phase", ["START", "END"])
def test_should_fail_closed_on_start_end_and_cancellation(
    monkeypatch: pytest.MonkeyPatch, phase: str,
) -> None:
    monkeypatch.setenv("HIVE_API_KEY", KEY.secret)
    monkeypatch.setenv("LLM_PROVIDER", "hive")
    result = ProviderResult("reply", "hive", MODEL, KEY.key_id)
    policy = fake_policy()
    policy.record.side_effect = lambda event: (_ for _ in ()).throw(
        ServiceSecurityError("CORE_POLICY_UNAVAILABLE")) if event["phase"] == phase else None
    with patch("app.core.rag.provider_gateway.generate_hive", return_value=result) as upstream:
        with pytest.raises(ServiceSecurityError):
            generate("prompt", policy)
    assert upstream.call_count == int(phase == "END")
    with patch("app.core.rag.provider_gateway.generate_hive") as upstream:
        with pytest.raises(GenerationCancelled):
            generate("prompt", fake_policy(), cancelled=lambda: True)
    upstream.assert_not_called()
