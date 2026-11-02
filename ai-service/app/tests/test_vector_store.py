from unittest.mock import MagicMock, patch, sentinel

import pytest

from app.services import vector_store
from app.services.chunker import CHUNKING_VERSION, ChunkResult
from app.services.vector_store import (
    VectorStoreUnavailableError,
    VectorStoreIncompleteError,
    get_document_chunks_exact,
    get_chroma_client,
    get_embedding_model,
    store_document_chunks,
)


def test_should_cache_explicit_ephemeral_client() -> None:
    with (
        patch("app.services.vector_store._ephemeral_client", None),
        patch("app.services.vector_store.chromadb.EphemeralClient", return_value=sentinel.client) as factory,
        patch.dict("os.environ", {"CHROMA_MODE": "ephemeral"}),
    ):
        assert get_chroma_client() is sentinel.client
        assert get_chroma_client() is sentinel.client

    factory.assert_called_once_with()


def test_should_fail_fast_when_cloud_configuration_is_incomplete() -> None:
    with (
        patch.dict("os.environ", {"CHROMA_MODE": "cloud"}, clear=True),
        patch("app.services.vector_store.chromadb.CloudClient") as cloud_client,
        pytest.raises(VectorStoreUnavailableError, match="configuration is incomplete"),
    ):
        get_chroma_client()

    cloud_client.assert_not_called()


def test_should_create_configured_cloud_client_without_local_fallback() -> None:
    with (
        patch.dict(
            "os.environ",
            {
                "CHROMA_MODE": "cloud",
                "CHROMA_CLOUD_API_KEY": "test-key",
                "CHROMA_CLOUD_TENANT": "test-tenant",
                "CHROMA_CLOUD_DATABASE": "test-database",
            },
            clear=True,
        ),
        patch("app.services.vector_store.chromadb.CloudClient", return_value=sentinel.client) as cloud,
        patch("app.services.vector_store.chromadb.HttpClient") as local,
    ):
        result = get_chroma_client()

    assert result is sentinel.client
    cloud.assert_called_once_with(
        tenant="test-tenant", database="test-database", api_key="test-key"
    )
    local.assert_not_called()


def test_should_surface_cloud_failure_without_trying_local_chroma() -> None:
    with (
        patch.dict(
            "os.environ",
            {
                "CHROMA_MODE": "cloud",
                "CHROMA_CLOUD_API_KEY": "test-key",
                "CHROMA_CLOUD_TENANT": "test-tenant",
            },
            clear=True,
        ),
        patch(
            "app.services.vector_store.chromadb.CloudClient",
            side_effect=RuntimeError("private"),
        ),
        patch("app.services.vector_store.chromadb.HttpClient") as local,
        pytest.raises(VectorStoreUnavailableError, match="Configured Chroma Cloud is unavailable"),
    ):
        get_chroma_client()

    local.assert_not_called()


def test_should_return_connected_local_chroma_client() -> None:
    client = MagicMock()
    with (
        patch.dict(
            "os.environ",
            {"CHROMA_MODE": "local", "CHROMA_SERVER_HOST": "chroma", "CHROMA_SERVER_HTTP_PORT": "8000"},
            clear=True,
        ),
        patch("app.services.vector_store.chromadb.HttpClient", return_value=client) as local,
    ):
        assert get_chroma_client() is client

    local.assert_called_once_with(host="chroma", port=8000)
    client.get_user_identity.assert_called_once_with()


def test_should_reject_unknown_chroma_mode() -> None:
    with (
        patch.dict("os.environ", {"CHROMA_MODE": "unknown"}, clear=True),
        pytest.raises(ValueError, match="Unsupported CHROMA_MODE"),
    ):
        get_chroma_client()


def test_should_cache_embedding_model(monkeypatch: pytest.MonkeyPatch) -> None:
    model = sentinel.model
    monkeypatch.setattr(vector_store, "_model", None)
    with patch("app.services.vector_store.SentenceTransformer", return_value=model) as factory:
        assert get_embedding_model() is model
        assert get_embedding_model() is model
    factory.assert_called_once_with(vector_store.EMBEDDING_MODEL_NAME)


def test_should_store_chunk_version_and_embed_heading_without_changing_cited_text() -> None:
    collection = MagicMock()
    client = MagicMock()
    client.get_or_create_collection.return_value = collection
    model = MagicMock()
    model.encode.return_value.tolist.return_value = [0.1, 0.2]
    chunk = ChunkResult(
        1,
        "Body text.",
        "PDF_PAGE",
        "page:2",
        "content-hash",
        section_heading="Section title",
    )

    with (
        patch("app.services.vector_store.get_chroma_client", return_value=client),
        patch("app.services.vector_store.get_embedding_model", return_value=model),
    ):
        count = store_document_chunks(
            "workspace-1", "document-1", [chunk], target_collection="unichat_chunks_v2"
        )

    assert count == 1
    model.encode.assert_called_once_with("passage: Section title\nBody text.")
    payload = collection.add.call_args.kwargs
    assert payload["documents"] == ["Body text."]
    assert payload["metadatas"][0]["chunking_version"] == CHUNKING_VERSION


def test_should_skip_collection_for_empty_chunk_list() -> None:
    with patch("app.services.vector_store.get_chroma_client") as get_client:
        assert store_document_chunks("workspace-1", "document-1", []) == 0
    get_client.assert_not_called()


def test_should_embed_plain_chunk_without_heading() -> None:
    collection = MagicMock()
    client = MagicMock()
    client.get_or_create_collection.return_value = collection
    model = MagicMock()
    model.encode.return_value.tolist.return_value = [0.1, 0.2]
    chunk = ChunkResult(1, "Body text.", "PDF_PAGE", "page:2", "content-hash")

    with (
        patch("app.services.vector_store.get_chroma_client", return_value=client),
        patch("app.services.vector_store.get_embedding_model", return_value=model),
    ):
        store_document_chunks(
            "workspace-1", "document-1", [chunk], target_collection="unichat_chunks_v2"
        )

    model.encode.assert_called_once_with("passage: Body text.")


def test_should_not_repeat_heading_already_in_source_text() -> None:
    collection = MagicMock()
    client = MagicMock()
    client.get_or_create_collection.return_value = collection
    model = MagicMock()
    model.encode.return_value.tolist.return_value = [0.1, 0.2]
    chunk = ChunkResult(
        1,
        "Section title\n\nBody text.",
        "PDF_PAGE",
        "page:2",
        "content-hash",
        section_heading="Section title",
    )

    with (
        patch("app.services.vector_store.get_chroma_client", return_value=client),
        patch("app.services.vector_store.get_embedding_model", return_value=model),
    ):
        store_document_chunks(
            "workspace-1", "document-1", [chunk], target_collection="unichat_chunks_v2"
        )

    model.encode.assert_called_once_with("passage: Section title\n\nBody text.")


def test_should_read_exact_manifest_chunk_ids_in_pages() -> None:
    import hashlib

    collection = MagicMock()
    text = "Chunk body."
    metadata = {
        "workspace_id": "workspace-1", "document_id": "document-1",
        "document_status": "PROCESSED", "ingestion_version": 3,
        "document_content_hash": "a" * 64, "chunk_index": 1,
        "content_hash": hashlib.sha256(text.encode("utf-8")).hexdigest(),
        "locator_type": "PDF_PAGE", "locator_value": "page:1",
    }
    collection.get.return_value = {
        "ids": ["document-1_1"], "documents": [text], "metadatas": [metadata],
    }
    client = MagicMock()
    client.get_collection.return_value = collection

    with (
        patch("app.services.vector_store.get_chroma_client", return_value=client),
        patch("app.services.vector_store.get_active_collection_name", return_value="chunks"),
    ):
        chunks = get_document_chunks_exact(
            "workspace-1", "document-1", 3, "a" * 64, 1, page_size=1
        )

    assert [chunk.chunk_id for chunk in chunks] == ["document-1_1"]
    collection.get.assert_called_once_with(ids=["document-1_1"], include=["documents", "metadatas"])


def test_should_fail_when_a_manifest_chunk_is_missing() -> None:
    collection = MagicMock()
    collection.get.return_value = {"ids": [], "documents": [], "metadatas": []}
    client = MagicMock()
    client.get_collection.return_value = collection

    with (
        patch("app.services.vector_store.get_chroma_client", return_value=client),
        patch("app.services.vector_store.get_active_collection_name", return_value="chunks"),
        pytest.raises(VectorStoreIncompleteError, match="missing"),
    ):
        get_document_chunks_exact("workspace-1", "document-1", 3, "a" * 64, 1)
