"""Transient-only fallback and durable attempt policies without external providers."""

import time
from datetime import UTC, datetime, timedelta
from typing import Any
from unittest.mock import Mock, patch

import httpx
import pytest

from app.core.rag.generation_policy import GenerationPolicy, GenerationPolicyError
from app.core.rag.key_registry import ProviderKey
from app.core.rag.provider_gateway import (
    AttemptBudget,
    ProviderFailure,
    ProviderResult,
    classify_failure,
    generate,
)
from app.core.service_security import ServiceSecurityError
from app.tests.plan_v2_fixtures import policy


def fake_policy() -> Mock:
    context = Mock(spec=GenerationPolicy)
    context.request_id = "request-id"
    context.operation_id = "operation-id"
    context.checkpoint.return_value = 30.0
    return context


@pytest.mark.parametrize("status,transient", [(401, False), (403, False), (400, False),
                                             (429, True), (500, True), (503, True)])
def test_should_classify_only_retryable_http_failures(status: int, transient: bool) -> None:
    request = httpx.Request("POST", "https://provider.invalid")
    error = httpx.HTTPStatusError("redacted", request=request,
                                 response=httpx.Response(status, request=request))
    assert classify_failure(error).transient is transient


@pytest.mark.parametrize("code,transient", [("PROVIDER_AUTH", False), ("SAFETY", False),
                                          ("PROVIDER_TIMEOUT", True)])
def test_should_fallback_only_for_transient_errors(monkeypatch: pytest.MonkeyPatch, code: str, transient: bool) -> None:
    monkeypatch.setenv("ENABLE_OLLAMA_FALLBACK", "true")
    context = fake_policy()
    events = []
    result = ProviderResult("answer", "ollama", "local", "ollama-local")
    with patch("app.core.rag.provider_gateway.configured_keys",
               return_value=[ProviderKey("primary", "PRIMARY", "secret")]):
        with patch("app.core.rag.provider_gateway._gemini",
                   side_effect=ProviderFailure(code, transient)) as primary:
            with patch("app.core.rag.provider_gateway._ollama", return_value=result) as fallback:
                if transient:
                    assert generate("prompt", context,
                                    observer=lambda kind, data: events.append(kind)) == result
                else:
                    with pytest.raises(ProviderFailure):
                        generate("prompt", context)
    assert primary.call_count == 1
    assert fallback.call_count == int(transient)
    assert context.record.call_args_list[0].args[0]["phase"] == "START"
    assert len(context.record.call_args_list) == (4 if transient else 2)
    if transient:
        assert events.count("reset") == 1


def test_should_never_call_model_without_durable_attempt_start() -> None:
    context = fake_policy()
    context.record.side_effect = ServiceSecurityError("CORE_POLICY_UNAVAILABLE")
    with patch("app.core.rag.provider_gateway.configured_keys",
               return_value=[ProviderKey("primary", "PRIMARY", "secret")]):
        with patch("app.core.rag.provider_gateway._gemini") as model:
            with pytest.raises(ServiceSecurityError):
                generate("private prompt", context)
    model.assert_not_called()


def test_should_checkpoint_again_before_fallback_and_limit_fallback_across_retries(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("ENABLE_OLLAMA_FALLBACK", "true")
    context = fake_policy()
    budget = AttemptBudget()
    with patch("app.core.rag.provider_gateway.configured_keys",
               return_value=[ProviderKey("primary", "PRIMARY", "secret")]):
        with patch("app.core.rag.provider_gateway._gemini",
                   side_effect=ProviderFailure("PROVIDER_TIMEOUT", True)):
            with patch("app.core.rag.provider_gateway._ollama",
                       return_value=ProviderResult("answer", "ollama", "local", "local")) as fallback:
                generate("prompt", context, budget=budget)
                with pytest.raises(ProviderFailure):
                    generate("same prompt", context, budget=budget)
    assert fallback.call_count == 1
    assert context.checkpoint.call_count >= 5


def test_should_stop_when_core_revokes_policy_between_attempts(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("ENABLE_OLLAMA_FALLBACK", "true")
    context = fake_policy()
    context.checkpoint.side_effect = [30, 30, GenerationPolicyError("CORE_POLICY_DENIED")]
    with patch("app.core.rag.provider_gateway.configured_keys",
               return_value=[ProviderKey("primary", "PRIMARY", "secret")]):
        with patch("app.core.rag.provider_gateway._gemini",
                   side_effect=ProviderFailure("PROVIDER_TIMEOUT", True)):
            with patch("app.core.rag.provider_gateway._ollama") as fallback:
                with pytest.raises(GenerationPolicyError):
                    generate("prompt", context)
    fallback.assert_not_called()


def test_should_keep_unmeasured_usage_null() -> None:
    context = fake_policy()
    with patch("app.core.rag.provider_gateway.configured_keys",
               return_value=[ProviderKey("primary", "PRIMARY", "secret")]):
        with patch("app.core.rag.provider_gateway._gemini",
                   return_value=ProviderResult("answer", "gemini", "test", "primary")):
            generate("prompt", context)
    event = context.record.call_args.args[0]
    assert event["inputTokens"] is None
    assert event["outputTokens"] is None
    assert "prompt" not in event and "secret" not in str(event)


def test_should_reject_cloud_denied_and_expired_operations_without_core_calls() -> None:
    with patch("app.core.rag.generation_policy.call_core") as core:
        with pytest.raises(GenerationPolicyError):
            GenerationPolicy("id", "op", False, time.time() + 120).checkpoint("CHAT")
        with pytest.raises(GenerationPolicyError):
            GenerationPolicy("id", "op", True, time.time() - 1).checkpoint("CHAT")
    core.assert_not_called()


@pytest.mark.parametrize("response", [
    {"allowed": False, "cloudAllowed": True},
    {"allowed": True, "cloudAllowed": False},
    {"allowed": True, "cloudAllowed": True, "deadlineAt": "bad"},
    {"allowed": True, "cloudAllowed": True,
     "deadlineAt": (datetime.now(UTC) - timedelta(seconds=1)).isoformat()},
])
def test_should_fail_closed_on_unavailable_or_invalid_core_checkpoint(response: dict[str, Any]) -> None:
    with patch("app.core.rag.generation_policy.call_core", return_value=response):
        with pytest.raises(GenerationPolicyError):
            policy().checkpoint("CHAT")


def test_should_respect_core_remaining_deadline_and_attempt_timeout() -> None:
    deadline = datetime.now(UTC) + timedelta(seconds=8)
    response = {"allowed": True, "cloudAllowed": True, "deadlineAt": deadline.isoformat()}
    with patch("app.core.rag.generation_policy.call_core", return_value=response):
        assert 0 < policy().checkpoint("CHAT") <= 8


