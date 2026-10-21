"""Cancellation reaches compaction, retry and private transports without synthetic results."""

import threading
from typing import Any
from unittest.mock import Mock, patch

import httpx
import pytest

from app.api.v1.ai_metrics import router as metrics_router
from app.api.v1.retrieval import router
from app.core.private_core import call_core
from app.core.rag.contracts import RetrievalAnswerRequest
from app.core.rag.conversation_memory import (
    CompactionOutputInvalid,
    ConversationMessage,
    acompact_conversation,
    compact_conversation,
)
from app.core.rag.llm_provider import generate_rag_answer
from app.core.rag.provider_contracts import GenerationCancelled, ProviderFailure, ProviderResult
from app.core.rag.stream_provider import _execute_stream
from app.core.service_security import ServiceSecurityError
from app.tests.plan_v2_fixtures import (
    DOCUMENT_ID,
    api_client,
    candidate,
    generated,
    payload,
    policy,
    source,
)
from app.tests.test_llm_provider_fallback import fake_policy


def answer(**options: Any) -> dict[str, Any]:
    """Exercise the genuine evidence and citation pipeline with local fixtures."""
    return generate_rag_answer("RAG là gì?", [candidate()], [DOCUMENT_ID],
                               policy=policy(), sources=[source()], **options)


@pytest.mark.parametrize("failure", [ProviderFailure("PROVIDER_TIMEOUT"),
    ServiceSecurityError("CORE_POLICY_DENIED"), GenerationCancelled("GENERATION_CANCELLED"),
    ValueError("unexpected configuration failure")])
def test_should_propagate_compaction_failure_and_never_start_chat(failure: Exception) -> None:
    with patch("app.core.rag.llm_provider.compact_conversation", side_effect=failure):
        with patch("app.core.rag.llm_provider.generate") as chat:
            with pytest.raises(type(failure)):
                answer(conversation_history=[{"role": "user", "content": "x" * 1000}] * 20)
    chat.assert_not_called()


@pytest.mark.parametrize("invalid", [True, False])
def test_should_not_start_chat_when_cancelled_during_valid_or_invalid_compaction(
    invalid: bool,
) -> None:
    closed = threading.Event()

    def compact(*arguments: object) -> str:
        closed.set()
        if invalid:
            raise CompactionOutputInvalid("invalid summary")
        return "verified summary"

    with patch("app.core.rag.llm_provider.compact_conversation", side_effect=compact):
        with patch("app.core.rag.llm_provider.generate") as chat:
            with pytest.raises(GenerationCancelled):
                answer(conversation_history=[{"role": "user", "content": "x" * 1000}] * 20,
                       cancelled=closed.is_set)
    chat.assert_not_called()


def test_should_check_cancellation_after_invalid_generation_before_retry() -> None:
    closed = threading.Event()

    def invalid(*arguments: object, **options: object) -> ProviderResult:
        closed.set()
        return ProviderResult("bad JSON", "hive", "model", "key")

    with patch("app.core.rag.llm_provider.generate", side_effect=invalid) as chat:
        with pytest.raises(GenerationCancelled):
            answer(cancelled=closed.is_set)
    assert chat.call_count == 1


@pytest.mark.parametrize("summary", ["", " " * 5, "x" * 5001])
def test_should_classify_only_invalid_compaction_output_as_best_effort(summary: str) -> None:
    with patch("app.core.rag.conversation_memory.generate",
               return_value=ProviderResult(summary, "hive", "model", "key")):
        with pytest.raises(CompactionOutputInvalid):
            compact_conversation([ConversationMessage(role="user", content="context")],
                                 policy=fake_policy())
    assert compact_conversation([], "prior") == "prior"


@pytest.mark.asyncio
async def test_should_forward_cancellation_through_async_compaction() -> None:
    closed = threading.Event()

    def compact(*arguments: object) -> str:
        assert arguments[-1] == closed.is_set
        closed.set()
        return "summary"

    with patch("app.core.rag.conversation_memory.compact_conversation", side_effect=compact):
        with pytest.raises(GenerationCancelled):
            await acompact_conversation([], policy=fake_policy(), cancelled=closed.is_set)


@pytest.mark.parametrize("failure,code", [(ProviderFailure("PROVIDER_HTTP_429"), "PROVIDER_HTTP_429"),
    (ServiceSecurityError("AI_MAINTENANCE"), "AI_MAINTENANCE"),
    (ServiceSecurityError("CORE_POLICY_DENIED"), "CORE_POLICY_DENIED"),
    (RuntimeError("raw private body"), "RETRIEVAL_UNAVAILABLE")])
def test_should_return_safe_http_and_sse_failure_without_success(
    failure: Exception, code: str,
) -> None:
    client = api_client(router)
    prepared = Mock(response=Mock(decision="ANSWER"))
    with patch("app.api.v1.retrieval.prepare_answer", return_value=prepared):
        with patch("app.api.v1.retrieval.complete_answer", side_effect=failure):
            http_response = client.post("/internal/v1/retrieval/answers", json=payload())
        with patch("app.core.rag.stream_provider.complete_answer", side_effect=failure):
            with patch("app.core.rag.stream_provider.prepare_answer", return_value=prepared):
                stream_response = client.post("/internal/v1/retrieval/answers/stream", json=payload())
    assert http_response.status_code == 503
    assert http_response.json()["errorCode"] == code
    assert "event: error" in stream_response.text
    assert "event: reset" in stream_response.text
    assert '"code": "' + code + '"' in stream_response.text
    assert "event: result" not in stream_response.text
    assert "raw private body" not in stream_response.text


def test_should_stop_stream_after_preparation_when_private_subscription_closes() -> None:
    closed = threading.Event()

    def prepare(*arguments: object, **options: object) -> None:
        closed.set()

    with patch("app.core.rag.stream_provider.prepare_answer", side_effect=prepare):
        with patch("app.core.rag.stream_provider.complete_answer") as chat:
            _execute_stream(RetrievalAnswerRequest.model_validate(payload()), Mock(), Mock(), closed)
    chat.assert_not_called()


@pytest.mark.parametrize("body,expected", [({"code": "AI_MAINTENANCE"}, "AI_MAINTENANCE"),
    ({"code": "raw secret"}, "CORE_POLICY_UNAVAILABLE"), ([], "CORE_POLICY_UNAVAILABLE")])
def test_should_preserve_only_safe_core_maintenance_code(
    monkeypatch: pytest.MonkeyPatch, body: object, expected: str,
) -> None:
    monkeypatch.setenv("CORE_API_BASE_URL", "https://core.invalid")
    request = httpx.Request("POST", "https://core.invalid/internal/v1/provider-attempts")
    response = httpx.Response(503, request=request, json=body)
    with patch("app.core.private_core.sign_core_request", return_value="offline-token"):
        with patch("app.core.private_core.httpx.Client") as client:
            client.return_value.__enter__.return_value.post.return_value = response
            with pytest.raises(ServiceSecurityError, match=expected):
                call_core("/internal/v1/provider-attempts", {}, "request-id")


@pytest.mark.parametrize("endpoint,body", [("verify-key", {"keyId": "hive-primary"}),
    ("quick-prompt", {"keyId": "hive-primary", "prompt": "check"})])
def test_should_preserve_maintenance_http_code_for_admin_start(
    endpoint: str, body: dict[str, str],
) -> None:
    method = "verify_key" if endpoint == "verify-key" else "quick_prompt"
    with patch("app.api.v1.ai_metrics.telemetry_tracker." + method,
               side_effect=ServiceSecurityError("AI_MAINTENANCE")):
        response = api_client(metrics_router).post("/internal/v1/metrics/ai/" + endpoint, json=body)
    assert response.status_code == 503
    assert response.headers["Retry-After"] == "30"
    assert response.json() == {"errorCode": "AI_MAINTENANCE", "requestId": "req-test"}


def test_should_copy_actual_model_attribution_into_private_response() -> None:
    actual_model = "deepseek-ai/deepseek-v4.1-flash-1017"
    result = ProviderResult(generated(), "hive", actual_model, "hive-primary")
    with patch("app.core.rag.answer_pipeline.retrieve_chunks", return_value=[candidate()]):
        with patch("app.core.rag.llm_provider.generate", return_value=result):
            response = api_client(router).post("/internal/v1/retrieval/answers", json=payload())
    assert response.json()["provider"] == actual_model
