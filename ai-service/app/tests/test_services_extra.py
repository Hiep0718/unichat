"""Tests for reingest, preflight, and vector_store modules."""

from unittest.mock import MagicMock, patch

from app.services.preflight_check import precache_embedding_model, run_preflight, verify_chromadb_compat
from app.services.reingest import reingest_document
from app.services.vector_store import get_active_collection_name, get_chroma_client, store_document_chunks


def test_get_active_collection_name() -> None:
    name = get_active_collection_name()
    assert "unichat_chunks" in name


def test_verify_chromadb_compat_mock() -> None:
    with patch("app.services.preflight_check.get_chroma_client") as mock_get_client:
        mock_client = MagicMock()
        mock_col = MagicMock()
        mock_col.query.return_value = {"ids": [["test1"]]}
        mock_client.get_or_create_collection.return_value = mock_col
        mock_get_client.return_value = mock_client

        res = verify_chromadb_compat()
        assert res is True


def test_precache_embedding_model_mock() -> None:
    with patch("app.services.preflight_check.SentenceTransformer") as mock_st:
        mock_model = MagicMock()
        mock_model.get_sentence_embedding_dimension.return_value = 768
        mock_st.return_value = mock_model

        res = precache_embedding_model()
        assert res is True


def test_reingest_document_mock() -> None:
    with patch("app.services.reingest.extract_blocks") as mock_extract, \
         patch("app.services.reingest.store_document_chunks") as mock_store:

        mock_extract.return_value = []
        mock_store.return_value = 0

        count = reingest_document(
            workspace_id="ws1",
            document_id="doc1",
            file_bytes=b"sample text content",
            media_type="text/plain",
        )
        assert count == 0
