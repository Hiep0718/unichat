"""Offline read-only contracts for lexical Chroma retrieval."""

from unittest.mock import MagicMock, patch

import pytest
from chromadb.errors import NotFoundError

from app.core.rag.lexical_retrieval import retrieve_lexical_chunks
from app.tests.plan_v2_fixtures import DOCUMENT_HASH, DOCUMENT_ID, source


def _metadata(**overrides: object) -> dict[str, object]:
    return {
        "workspace_id": "workspace-1",
        "document_id": DOCUMENT_ID,
        "document_status": "PROCESSED",
        "ingestion_version": 2,
        "document_content_hash": DOCUMENT_HASH,
        "locator_type": "PDF_PAGE",
        "locator_value": "page:10",
        "content_hash": "a" * 64,
        "chunk_index": 9,
        "chunking_version": "2.0",
        **overrides,
    }


def test_should_read_exact_terms_under_the_current_authorized_snapshot() -> None:
    collection = MagicMock()
    collection.get.return_value = {
        "ids": ["chunk-10", "cross-workspace", "stale-version"],
        "documents": ["Kiến trúc monolithic."] * 3,
        "metadatas": [
            _metadata(),
            _metadata(workspace_id="workspace-2"),
            _metadata(ingestion_version=3),
        ],
    }
    client = MagicMock()
    client.get_collection.return_value = collection

    with (
        patch("app.core.rag.retrieval_engine.get_chroma_client", return_value=client),
        patch(
            "app.core.rag.retrieval_engine.get_active_collection_name",
            return_value="unichat_chunks_v2",
        ),
    ):
        results = retrieve_lexical_chunks(
            "workspace-1", [DOCUMENT_ID], ["Kiến trúc monolithic là gì?"],
            [source()], limit=5,
        )

    assert [item.chunk_id for item in results] == ["chunk-10"]
    assert results[0].similarity == pytest.approx(1.0)
    where = collection.get.call_args.kwargs["where"]["$and"]
    assert {"workspace_id": {"$eq": "workspace-1"}} in where
    assert {"document_id": {"$in": [DOCUMENT_ID]}} in where
    searched_terms = {
        call.kwargs["where_document"]["$contains"]
        for call in collection.get.call_args_list
    }
    assert "Kiến" in searched_terms
    assert "monolithic" in searched_terms
    client.create_collection.assert_not_called()
    client.get_or_create_collection.assert_not_called()
    client.delete_collection.assert_not_called()
    collection.add.assert_not_called()
    collection.upsert.assert_not_called()
    collection.update.assert_not_called()
    collection.delete.assert_not_called()


def test_should_treat_only_missing_collection_as_empty() -> None:
    client = MagicMock()
    client.get_collection.side_effect = NotFoundError("missing")
    with patch("app.core.rag.retrieval_engine.get_chroma_client", return_value=client):
        assert retrieve_lexical_chunks(
            "workspace-1", [DOCUMENT_ID], ["monolithic"], [source()], 5
        ) == []


def test_should_propagate_operational_collection_failure() -> None:
    client = MagicMock()
    client.get_collection.side_effect = RuntimeError("connection failed")
    with (
        patch("app.core.rag.retrieval_engine.get_chroma_client", return_value=client),
        pytest.raises(RuntimeError, match="connection failed"),
    ):
        retrieve_lexical_chunks(
            "workspace-1", [DOCUMENT_ID], ["monolithic"], [source()], 5
        )


def test_should_discard_substring_and_low_overlap_noise_chunks() -> None:
    collection = MagicMock()
    collection.get.return_value = {
        "ids": ["noise-strong", "valid-match"],
        "documents": [
            "Strong coupling in code design",
            "Kiến trúc phân tầng và microservices",
        ],
        "metadatas": [_metadata(), _metadata(chunk_index=10)],
    }
    client = MagicMock()
    client.get_collection.return_value = collection

    with (
        patch("app.core.rag.retrieval_engine.get_chroma_client", return_value=client),
        patch(
            "app.core.rag.retrieval_engine.get_active_collection_name",
            return_value="unichat_chunks_v2",
        ),
    ):
        results = retrieve_lexical_chunks(
            "workspace-1",
            [DOCUMENT_ID],
            ["Các kiến trúc đề cập trong tài liệu là gì"],
            [source()],
            limit=5,
        )

    searched_terms = {
        call.kwargs["where_document"]["$contains"]
        for call in collection.get.call_args_list
    }
    assert searched_terms == {"kiến", "trúc"}
    assert [item.chunk_id for item in results] == ["valid-match"]
    assert results[0].similarity == pytest.approx(1.0)
