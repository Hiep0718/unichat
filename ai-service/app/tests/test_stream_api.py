"""Unit tests for FastAPI SSE streaming endpoint /internal/v1/retrieval/answers/stream."""

from typing import Any, AsyncGenerator
from unittest.mock import AsyncMock, patch
from fastapi.testclient import TestClient

from app.core.rag.retrieval_engine import RetrievedChunkCandidate
from app.main import create_app

client = TestClient(create_app())


def test_retrieval_answer_stream_empty_allowed_docs() -> None:
    payload = {
        "workspaceId": "ws-stream-1",
        "allowedDocumentIds": [],
        "question": "Hỏi đáp SSE stream",
    }
    res = client.post("/internal/v1/retrieval/answers/stream", json=payload)
    assert res.status_code == 200
    assert "text/event-stream" in res.headers["content-type"]
    body = res.text
    assert "event: metadata" in body
    assert "NO_ALLOWED_DOCUMENTS" in body
    assert "event: done" in body


def test_retrieval_answer_stream_clarify_flow() -> None:
    payload = {
        "workspaceId": "ws-stream-1",
        "allowedDocumentIds": ["doc-1"],
        "question": "cái đó là gì",
    }
    res = client.post("/internal/v1/retrieval/answers/stream", json=payload)
    assert res.status_code == 200
    assert "text/event-stream" in res.headers["content-type"]
    body = res.text
    assert "event: metadata" in body
    assert "CLARIFY_REQUIRED" in body
    assert "event: done" in body


def test_retrieval_answer_stream_success_flow() -> None:
    payload = {
        "workspaceId": "ws-stream-1",
        "allowedDocumentIds": ["doc-1"],
        "question": "Giải thích về RAG architecture",
    }

    dummy_candidate = RetrievedChunkCandidate(
        chunk_id="c1",
        document_id="doc-1",
        text="Tri thức RAG kiến trúc",
        similarity=0.90,
        locator_type="PDF_PAGE",
        locator_value="page:1",
        content_hash="h1",
    )

    async def dummy_generator(*args: Any, **kwargs: Any) -> AsyncGenerator[str, None]:
        yield "event: metadata\ndata: {\"decision\": \"ANSWER\", \"intent\": \"FACT\"}\n\n"
        yield "event: token\ndata: {\"delta\": \"Kiến trúc RAG \"}\n\n"
        yield "event: token\ndata: {\"delta\": \"hoạt động tốt [1].\"}\n\n"
        yield "event: done\ndata: {\"messageId\": \"req-123\"}\n\n"

    with patch("app.api.v1.retrieval.retrieve_chunks", return_value=[dummy_candidate]):
        with patch("app.api.v1.retrieval.generate_rag_answer_stream", side_effect=dummy_generator):
            res = client.post("/internal/v1/retrieval/answers/stream", json=payload)
            assert res.status_code == 200
            assert "text/event-stream" in res.headers["content-type"]
            body = res.text
            assert "event: metadata" in body
            assert "event: token" in body
            assert "Kiến trúc RAG" in body
            assert "event: done" in body
