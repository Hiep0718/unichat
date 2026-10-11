"""Private SSE contract: provisional data plus a result, never public commit events."""

import json
from typing import Any
from unittest.mock import patch

import httpx
import pytest

from app.api.v1.retrieval import router
from app.core.rag.provider_gateway import ProviderResult
from app.core.rag.stream_provider import ProvisionalClaims
from app.tests.plan_v2_fixtures import api_client, candidate, generated, payload

client = api_client(router)


def frames(response: httpx.Response) -> list[tuple[str, dict[str, Any]]]:
    return [(block.splitlines()[0][7:], json.loads(block.splitlines()[1][6:]))
            for block in response.text.strip().split("\n\n")]


@pytest.mark.parametrize("changes,code", [
    ({"cloudAllowed": False}, "CLOUD_POLICY_DENIED"),
    ({"allowedDocumentIds": []}, "NO_ALLOWED_DOCUMENTS"),
    ({"question": "cái đó là gì"}, "CLARIFY_REQUIRED"),
])
def test_should_emit_private_refusal_or_clarification_without_public_success(changes: dict[str, Any], code: str) -> None:
    with patch("app.core.rag.answer_pipeline.generate_rag_answer") as generator:
        response = client.post("/internal/v1/retrieval/answers/stream", json=payload(**changes))
    events = frames(response)
    assert response.status_code == 200
    assert events[0][0] == "metadata"
    assert events[-1][0] == "result"
    assert events[-1][1]["refusalCode"] == code
    assert not {"final", "done"} & {event for event, _ in events}
    generator.assert_not_called()


def test_should_emit_utf8_provisional_claims_and_one_validated_result() -> None:
    def fake_generate(*args: Any, **kwargs: Any) -> ProviderResult:
        observer = kwargs["observer"]
        observer("attempt", {"attemptId": "attempt-1"})
        observer("raw", {"delta": generated()})
        return ProviderResult(generated(), "gemini", "test-model", "primary")

    with patch("app.core.rag.answer_pipeline.retrieve_chunks", return_value=[candidate()]):
        with patch("app.core.rag.llm_provider.generate", side_effect=fake_generate):
            response = client.post("/internal/v1/retrieval/answers/stream", json=payload())
    events = frames(response)
    tokens = [data for event, data in events if event == "token"]
    assert tokens[0]["delta"] == "RAG dựa trên tài liệu.\n\n"
    assert tokens[0]["attemptId"] == "attempt-1"
    assert tokens[0]["provisional"] is True
    assert events[-1][0] == "result"
    assert events[-1][1]["answer"] == "RAG dựa trên tài liệu. [1]"
    assert not {"final", "done"} & {event for event, _ in events}


def test_should_emit_error_and_reset_without_result_after_dependency_failure() -> None:
    with patch("app.core.rag.answer_pipeline.retrieve_chunks", side_effect=RuntimeError("secret")):
        response = client.post("/internal/v1/retrieval/answers/stream", json=payload())
    events = frames(response)
    assert events[-1][0] == "error"
    assert events[-2][0] == "reset"
    assert "secret" not in response.text
    assert not {"result", "final", "done"} & {event for event, _ in events}


def test_should_clear_old_attempt_and_keep_monotonic_token_sequence() -> None:
    provisional = ProvisionalClaims()
    provisional.observe("attempt", {"attemptId": "first"})
    first = provisional.observe("raw", {"delta": '{"text":"Tiếng Việt"}'})
    reset = provisional.observe("reset", {"reason": "VALIDATION_RETRY"})
    provisional.observe("attempt", {"attemptId": "second"})
    second = provisional.observe("raw", {"delta": '{"text":"Nội dung mới"}'})
    assert first[0][1]["sequence"] == 1
    assert reset[0][0] == "reset"
    assert second[0][1]["sequence"] == 2
    assert second[0][1]["attemptId"] == "second"
    assert "Tiếng Việt" not in second[0][1]["delta"]


def test_should_emit_no_token_until_complete_escaped_text() -> None:
    provisional = ProvisionalClaims()
    assert provisional.observe("raw", {"delta": '{"text":"Có dấu'}) == []
    result = provisional.observe("raw", {"delta": '\\nđầy đủ"}'})
    assert result[0][1]["delta"] == "Có dấu\nđầy đủ\n\n"
