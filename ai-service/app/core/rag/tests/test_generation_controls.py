"""Control cancellation and safety refusals survive preparation and accounting failures."""

import json
import threading
from unittest.mock import Mock, patch

import pytest

from app.core.rag.answer_pipeline import prepare_answer
from app.core.rag.contracts import RetrievalAnswerRequest
from app.core.rag.hive_sse import HiveCompletion
from app.core.rag.key_registry import ProviderKey
from app.core.rag.provider_contracts import GenerationCancelled, ProviderFailure
from app.core.rag.provider_gateway import generate
from app.core.rag.retrieval_engine import RetrievedChunkCandidate
from app.core.rag.stream_provider import _execute_stream
from app.core.rag.tests.test_generation_lifecycle import answer
from app.core.service_security import ServiceSecurityError
from app.tests.plan_v2_fixtures import candidate, payload
from app.tests.test_llm_provider_fallback import fake_policy


def test_should_skip_preparation_after_private_cancellation() -> None:
    closed = threading.Event()
    closed.set()
    with patch("app.core.rag.stream_provider.prepare_answer") as preparation:
        _execute_stream(RetrievalAnswerRequest.model_validate(payload()), Mock(), Mock(), closed)
    preparation.assert_not_called()


def test_should_skip_retrieval_when_preparation_is_already_cancelled() -> None:
    with patch("app.core.rag.answer_pipeline.retrieve_chunks") as retrieval:
        with pytest.raises(GenerationCancelled):
            prepare_answer(RetrievalAnswerRequest.model_validate(payload()), lambda: True)
    retrieval.assert_not_called()


def test_should_stop_preparation_after_retrieval_cancels() -> None:
    closed = threading.Event()

    def retrieve(*arguments: object) -> list[RetrievedChunkCandidate]:
        closed.set()
        return [candidate()]

    with patch("app.core.rag.answer_pipeline.retrieve_chunks", side_effect=retrieve):
        with patch("app.core.rag.answer_pipeline.evaluate_evidence") as evidence:
            with pytest.raises(GenerationCancelled):
                prepare_answer(RetrievalAnswerRequest.model_validate(payload()), closed.is_set)
    evidence.assert_not_called()


@pytest.mark.parametrize("original", [GenerationCancelled("GENERATION_CANCELLED"),
    ServiceSecurityError("CORE_POLICY_DENIED")])
def test_should_preserve_control_failure_when_attempt_end_is_unacknowledged(
    original: Exception, caplog: pytest.LogCaptureFixture,
) -> None:
    context = fake_policy()
    context.record.side_effect = [None, ServiceSecurityError("private provider body")]
    with patch("app.core.rag.provider_gateway.configured_keys",
               return_value=[ProviderKey("primary", "PRIMARY", "secret")]):
        with patch("app.core.rag.provider_gateway._gemini", side_effect=original):
            with pytest.raises(type(original)) as caught:
                generate("private prompt", context)
    assert caught.value is original
    assert context.record.call_count == 2
    assert "attempt_end_failed" in caplog.text
    assert "private provider body" not in caplog.text
    assert "private prompt" not in caplog.text


@pytest.mark.parametrize("stage", ["CHAT", "COMPACTION"])
def test_should_return_content_free_safety_refusal_without_further_generation(stage: str) -> None:
    failure = ProviderFailure("PROVIDER_REFUSAL")
    history = [{"role": "user", "content": "x" * 1000}] * 20 if stage == "COMPACTION" else []
    with patch("app.core.rag.llm_provider.compact_conversation", side_effect=failure):
        with patch("app.core.rag.llm_provider.generate", side_effect=failure) as generator:
            result = answer(conversation_history=history)
    assert result["refusalCode"] == "SAFETY_REFUSAL"
    assert result["answer"] is None
    assert result["citations"] == []
    assert result["sections"] == []
    assert generator.call_count == (1 if stage == "CHAT" else 0)


@pytest.mark.parametrize("code", ["PROVIDER_HTTP_401", "PROVIDER_PROTOCOL_ERROR",
                                 "PROVIDER_TRUNCATED_RESPONSE"])
def test_should_keep_non_safety_provider_failures_operational(code: str) -> None:
    with patch("app.core.rag.llm_provider.generate", side_effect=ProviderFailure(code)) as generator:
        with pytest.raises(ProviderFailure, match=code):
            answer()
    assert generator.call_count == 1


@pytest.mark.parametrize("choice", [{"delta": {"refusal": "private reason"}},
    {"refusal": "private reason"}, {"finish_reason": "content_filter"}])
def test_should_classify_explicit_provider_safety_signals_without_exposing_reason(
    choice: dict[str, object],
) -> None:
    with pytest.raises(ProviderFailure, match="^PROVIDER_REFUSAL$"):
        HiveCompletion().accept(json.dumps({"choices": [choice]}))
