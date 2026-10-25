"""Private RAG HTTP boundary using genuine policy and source fixtures."""

import logging
from typing import Any
from unittest.mock import patch

import pytest

from app.api.v1.retrieval import router
from app.core.rag.provider_gateway import ProviderResult
from app.tests.plan_v2_fixtures import (
    DOCUMENT_HASH,
    DOCUMENT_ID,
    api_client,
    candidate,
    generated,
    payload,
)

client = api_client(router)


def test_should_return_source_safe_refusal_without_generator() -> None:
    with patch("app.core.rag.answer_pipeline.generate_rag_answer") as generator:
        response = client.post("/internal/v1/retrieval/answers",
                               json=payload(allowedDocumentIds=[]))
    assert response.status_code == 200
    assert response.json()["decision"] == "REFUSE"
    assert response.json()["refusalCode"] == "NO_ALLOWED_DOCUMENTS"
    generator.assert_not_called()


@pytest.mark.parametrize("expanded", [False, True])
def test_should_return_validated_answer_with_actual_provenance(expanded: bool) -> None:
    result = ProviderResult(generated(expanded=expanded), "gemini", "test-model", "primary")
    with patch("app.core.rag.answer_pipeline.retrieve_chunks", return_value=[candidate()]):
        with patch("app.core.rag.llm_provider.generate", return_value=result):
            response = client.post("/internal/v1/retrieval/answers",
                                   json=payload(allowExternalKnowledge=expanded))
    body = response.json()
    assert response.status_code == 200
    assert body["decision"] == "ANSWER"
    assert body["knowledgeMode"] == ("EXPANDED" if expanded else "STRICT")
    assert body["citations"][0]["chunkId"] == "real-chunk-101"
    assert body["citations"][0]["contentHash"] == candidate().content_hash
    assert body["sections"][0]["type"] == "DOCUMENT"


@pytest.mark.parametrize("changes", [{"workspaceId": "bad"}, {"question": "ab"},
                                     {"cloudAllowed": "true"}, {"question": "a" * 2001}])
def test_should_reject_invalid_input_before_dependency_calls(changes: dict[str, Any]) -> None:
    with patch("app.core.rag.answer_pipeline.retrieve_chunks") as retrieval:
        response = client.post("/internal/v1/retrieval/answers", json=payload(**changes))
    assert response.status_code == 422
    retrieval.assert_not_called()


def test_should_return_safe_dependency_failure() -> None:
    with patch("app.core.rag.answer_pipeline.retrieve_chunks", side_effect=RuntimeError("secret")):
        response = client.post("/internal/v1/retrieval/answers", json=payload())
    assert response.status_code == 503
    assert "secret" not in response.text
    assert response.json()["errorCode"] == "RETRIEVAL_UNAVAILABLE"


def test_should_retrieve_with_validated_context_but_generate_from_original_question(
    caplog: pytest.LogCaptureFixture,
) -> None:
    caplog.set_level(logging.INFO, logger="app.core.rag.answer_pipeline")
    question = "Why does it work?"
    history = [
        {"role": "user", "content": "Explain vector embeddings"},
        {
            "role": "assistant",
            "content": "Embeddings map text into numeric vectors.",
            "sources": [{
                "documentId": DOCUMENT_ID,
                "ingestionVersion": 2,
                "contentHash": DOCUMENT_HASH,
            }],
        },
    ]
    generated_result = {
        "answer": "A validated answer.",
        "sections": [],
        "citations": [],
        "provider": "test",
    }

    with (
        patch("app.core.rag.answer_pipeline.retrieve_chunks", return_value=[candidate()]) as retrieval,
        patch(
            "app.core.rag.answer_pipeline.generate_rag_answer",
            return_value=generated_result,
        ) as generator,
    ):
        response = client.post(
            "/internal/v1/retrieval/answers",
            json=payload(question=question, conversationHistory=history),
        )

    assert response.status_code == 200
    retrieval.assert_called_once()
    assert retrieval.call_args.args[2] == question
    assert "vector embeddings" in retrieval.call_args.kwargs["contextual_query"]
    assert generator.call_args.args[0] == question
    query_event = next(record for record in caplog.records if record.msg == "retrieval_query_variants")
    assert getattr(query_event, "contextual_query_used", False) is True
    assert not hasattr(query_event, "question")
