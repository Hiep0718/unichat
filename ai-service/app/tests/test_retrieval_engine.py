import copy
from typing import Any
from unittest.mock import MagicMock, patch

import pytest
from chromadb.errors import NotFoundError

from app.core.rag.retrieval_engine import retrieve_chunks
from app.core.rag.strategy_selector import RetrievalStrategy
from app.tests.plan_v2_fixtures import DOCUMENT_HASH, DOCUMENT_ID, source

STRATEGY = RetrievalStrategy(5, 0.5, 4, 1, 0.5)


def _query_result() -> dict[str, Any]:
    metadata = {
        "workspace_id": "workspace-1",
        "document_id": "allowed-doc",
        "document_status": "PROCESSED",
        "locator_type": "PDF_PAGE",
        "locator_value": "page:1",
        "content_hash": "chunk-hash",
        "ingestion_version": 2,
        "document_content_hash": "document-hash",
    }
    return {
        "ids": [["chunk-1", "chunk-2"], ["chunk-1", "chunk-3"]],
        "documents": [["source one", "source two"], ["source one", "source three"]],
        "distances": [[0.2, 0.3], [0.1, 0.4]],
        "metadatas": [
            [dict(metadata), dict(metadata)],
            [dict(metadata), dict(metadata)],
        ],
    }


def test_should_batch_original_and_context_queries_under_same_allowlist() -> None:
    collection = MagicMock()
    collection.query.return_value = _query_result()
    client = MagicMock()
    client.get_collection.return_value = collection
    model = MagicMock()
    model.encode.return_value.tolist.return_value = [[1.0], [2.0]]

    with (
        patch("app.core.rag.retrieval_engine.get_chroma_client", return_value=client),
        patch("app.core.rag.retrieval_engine.get_embedding_model", return_value=model),
        patch("app.core.rag.retrieval_engine.get_active_collection_name", return_value="unichat_chunks_v1"),
    ):
        results = retrieve_chunks(
            "workspace-1", ["allowed-doc"], "What about it?", STRATEGY, "context: embeddings"
        )

    assert [item.chunk_id for item in results] == ["chunk-1", "chunk-2", "chunk-3"]
    assert results[0].similarity == pytest.approx(0.9)
    assert results[0].ingestion_version == 2
    assert results[0].document_content_hash == "document-hash"
    model.encode.assert_called_once_with(["query: What about it?", "query: context: embeddings"])
    query = collection.query.call_args.kwargs
    assert len(query["query_embeddings"]) == 2
    assert {"document_id": {"$in": ["allowed-doc"]}} in query["where"]["$and"]


def test_should_treat_only_a_missing_collection_as_empty_evidence() -> None:
    client = MagicMock()
    client.get_collection.side_effect = NotFoundError("collection missing")
    model = MagicMock()
    model.encode.return_value.tolist.return_value = [[1.0]]

    with (
        patch("app.core.rag.retrieval_engine.get_chroma_client", return_value=client),
        patch("app.core.rag.retrieval_engine.get_embedding_model", return_value=model),
        patch("app.core.rag.retrieval_engine.get_active_collection_name", return_value="unichat_chunks_v2"),
    ):
        results = retrieve_chunks("workspace-1", ["allowed-doc"], "question", STRATEGY)

    assert results == []
    model.encode.assert_not_called()
    assert client.get_collection.call_count == 2


def test_should_propagate_vector_store_errors_instead_of_returning_empty_evidence() -> None:
    client = MagicMock()
    client.get_collection.side_effect = RuntimeError("connection failed")
    model = MagicMock()
    model.encode.return_value.tolist.return_value = [[1.0]]

    with (
        patch("app.core.rag.retrieval_engine.get_chroma_client", return_value=client),
        patch("app.core.rag.retrieval_engine.get_embedding_model", return_value=model),
        patch("app.core.rag.retrieval_engine.get_active_collection_name", return_value="unichat_chunks_v1"),
        pytest.raises(RuntimeError, match="connection failed"),
    ):
        retrieve_chunks("workspace-1", ["allowed-doc"], "question", STRATEGY)


def test_should_supplement_v2_results_from_v1_without_duplicate_chunks() -> None:
    metadata = {
        "workspace_id": "workspace-1",
        "document_id": "allowed-doc",
        "document_status": "PROCESSED",
        "locator_type": "PDF_PAGE",
        "locator_value": "page:1",
    }
    v2 = MagicMock()
    v2.query.return_value = {
        "ids": [["same-chunk"]],
        "documents": [["v2 text"]],
        "distances": [[0.2]],
        "metadatas": [[metadata]],
    }
    v1 = MagicMock()
    v1.query.return_value = {
        "ids": [["same-chunk", "v1-only"]],
        "documents": [["old duplicate", "older text"]],
        "distances": [[0.05, 0.3]],
        "metadatas": [[metadata, metadata]],
    }
    client = MagicMock()
    client.get_collection.side_effect = lambda *, name: {
        "unichat_chunks_v2": v2,
        "unichat_chunks_v1": v1,
    }[name]
    model = MagicMock()
    model.encode.return_value.tolist.return_value = [[1.0]]

    with (
        patch("app.core.rag.retrieval_engine.get_chroma_client", return_value=client),
        patch("app.core.rag.retrieval_engine.get_embedding_model", return_value=model),
        patch(
            "app.core.rag.retrieval_engine.get_active_collection_name",
            return_value="unichat_chunks_v2",
        ),
    ):
        results = retrieve_chunks("workspace-1", ["allowed-doc"], "question", STRATEGY)

    assert [(item.chunk_id, item.text) for item in results] == [
        ("same-chunk", "v2 text"),
        ("v1-only", "older text"),
    ]
    assert model.encode.call_count == 1


def test_should_filter_dense_queries_and_results_by_current_source_snapshot() -> None:
    current = copy.deepcopy(_query_result())
    current["metadatas"][0][0].update(
        {"document_id": DOCUMENT_ID, "document_content_hash": DOCUMENT_HASH}
    )
    current["metadatas"][0][1].update({"workspace_id": "workspace-2"})
    current["metadatas"][1][0].update({"ingestion_version": 3})
    current["metadatas"][1][1].update(
        {"document_id": DOCUMENT_ID, "document_content_hash": DOCUMENT_HASH}
    )
    collection = MagicMock()
    collection.query.return_value = current
    client = MagicMock()
    client.get_collection.return_value = collection
    model = MagicMock()
    model.encode.return_value.tolist.return_value = [[1.0], [2.0]]

    with (
        patch("app.core.rag.retrieval_engine.get_chroma_client", return_value=client),
        patch("app.core.rag.retrieval_engine.get_embedding_model", return_value=model),
        patch(
            "app.core.rag.retrieval_engine.get_active_collection_name",
            return_value="unichat_chunks_v1",
        ),
    ):
        results = retrieve_chunks(
            "workspace-1", [DOCUMENT_ID], "Câu hỏi chính", STRATEGY,
            query_variants=["Biến thể"], sources=[source()],
        )

    assert [item.chunk_id for item in results] == ["chunk-1", "chunk-3"]
    where = collection.query.call_args.kwargs["where"]
    assert where == {
        "$and": [
            {"workspace_id": {"$eq": "workspace-1"}},
            {"document_status": {"$eq": "PROCESSED"}},
            {"document_id": {"$in": [DOCUMENT_ID]}},
        ]
    }
    assert "$or" not in str(where)
    model.encode.assert_called_once_with(["query: Câu hỏi chính", "query: Biến thể"])



def test_should_diversify_dense_candidates_across_multiple_authorized_documents() -> None:
    def _meta(doc_id: str) -> dict[str, object]:
        return {
            "workspace_id": "workspace-1",
            "document_id": doc_id,
            "document_status": "PROCESSED",
            "locator_type": "SLIDE_NUMBER",
            "locator_value": "slide:1",
            "content_hash": "chunk-hash",
        }

    collection = MagicMock()
    collection.query.return_value = {
        "ids": [["intro-1", "intro-2", "intro-3", "intro-4", "layered-1", "micro-1"]],
        "documents": [["i1", "i2", "i3", "i4", "l1", "m1"]],
        "distances": [[0.10, 0.11, 0.12, 0.13, 0.18, 0.20]],
        "metadatas": [[
            _meta("doc-intro"),
            _meta("doc-intro"),
            _meta("doc-intro"),
            _meta("doc-intro"),
            _meta("doc-layered"),
            _meta("doc-micro"),
        ]],
    }
    client = MagicMock()
    client.get_collection.return_value = collection
    model = MagicMock()
    model.encode.return_value.tolist.return_value = [[1.0]]

    with (
        patch("app.core.rag.retrieval_engine.get_chroma_client", return_value=client),
        patch("app.core.rag.retrieval_engine.get_embedding_model", return_value=model),
        patch(
            "app.core.rag.retrieval_engine.get_active_collection_name",
            return_value="unichat_chunks_v1",
        ),
    ):
        results = retrieve_chunks(
            "workspace-1",
            ["doc-intro", "doc-layered", "doc-micro"],
            "Các kiến trúc phần mềm",
            STRATEGY,
        )

    assert [item.chunk_id for item in results] == ["intro-1", "intro-2", "layered-1", "micro-1"]
    assert {item.document_id for item in results} == {"doc-intro", "doc-layered", "doc-micro"}
