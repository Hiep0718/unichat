"""Tests for reingest, preflight, and vector_store modules."""

from unittest.mock import MagicMock, patch

import pytest

from app.services.preflight_check import (
    precache_embedding_model,
    run_preflight,
    verify_chromadb_compat,
)
from app.services.reingest import reingest_document
from app.services.vector_store import (
    VectorStoreUnavailableError,
    get_active_collection_name,
    get_chroma_client,
)


def test_get_active_collection_name() -> None:
    name = get_active_collection_name()
    assert "unichat_chunks" in name


def test_verify_chromadb_compat_mock() -> None:
    with patch("app.services.preflight_check.get_chroma_client") as mock_get_client:
        mock_client = MagicMock()
        mock_col = MagicMock()
        mock_col.count.return_value = 1719
        mock_client.get_collection.return_value = mock_col
        mock_get_client.return_value = mock_client

        res = verify_chromadb_compat()
        assert res is True
        mock_client.get_collection.assert_called_once()
        mock_client.get_or_create_collection.assert_not_called()
        mock_client.create_collection.assert_not_called()
        mock_client.delete_collection.assert_not_called()
        mock_col.add.assert_not_called()
        mock_col.upsert.assert_not_called()
        mock_col.update.assert_not_called()
        mock_col.delete.assert_not_called()


def test_run_preflight_should_fail_when_chroma_is_not_compatible() -> None:
    with (
        patch("app.services.preflight_check.verify_chromadb_compat", return_value=False),
        patch("app.services.preflight_check.precache_embedding_model", return_value=True),
    ):
        assert run_preflight() is False


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


def test_local_chroma_connection_failure_does_not_fall_back_to_ephemeral() -> None:
    with patch.dict("os.environ", {"CHROMA_MODE": "local"}):
        with patch("app.services.vector_store.chromadb.HttpClient", side_effect=RuntimeError):
            with patch("app.services.vector_store.chromadb.EphemeralClient") as ephemeral:
                with pytest.raises(VectorStoreUnavailableError):
                    get_chroma_client()
    ephemeral.assert_not_called()
