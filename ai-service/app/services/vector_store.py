import logging
import os
from typing import Any

import chromadb
from sentence_transformers import SentenceTransformer

from app.services.chunker import CHUNKING_VERSION, ChunkResult

logger = logging.getLogger(__name__)

EMBEDDING_MODEL_NAME = "intfloat/multilingual-e5-base"
COLLECTION_V1 = "unichat_chunks_v1"
COLLECTION_V2 = "unichat_chunks_v2"
COLLECTION_NAME = COLLECTION_V2

_model: SentenceTransformer | None = None
_ephemeral_client: Any = None


class VectorStoreUnavailableError(RuntimeError):
    """Raised when the configured vector store cannot be reached or initialized."""


def get_embedding_model() -> SentenceTransformer:
    """Return the lazily initialized multilingual E5 embedding model."""
    global _model
    if _model is None:
        _model = SentenceTransformer(EMBEDDING_MODEL_NAME)
    return _model


def get_chroma_client() -> Any:
    """Return the explicitly configured Chroma client or raise an operational error."""
    global _ephemeral_client
    mode = os.getenv("CHROMA_MODE", "auto").lower()

    if mode == "ephemeral":
        if _ephemeral_client is None:
            _ephemeral_client = chromadb.EphemeralClient()
        return _ephemeral_client
    if mode not in {"auto", "cloud", "local"}:
        raise ValueError(f"Unsupported CHROMA_MODE: {mode}")

    cloud_api_key = os.getenv("CHROMA_CLOUD_API_KEY") or os.getenv("CHROMA_API_KEY", "")
    tenant = os.getenv("CHROMA_CLOUD_TENANT") or os.getenv("CHROMA_TENANT", "")
    database = os.getenv("CHROMA_CLOUD_DATABASE") or os.getenv(
        "CHROMA_DATABASE", "default_database"
    )
    host = os.getenv("CHROMA_HOST", "")

    cloud_requested = mode == "cloud" or (
        mode == "auto" and (cloud_api_key or tenant or "trychroma.com" in host)
    )
    if cloud_requested:
        if not cloud_api_key or not tenant:
            raise VectorStoreUnavailableError("Chroma Cloud configuration is incomplete.")
        try:
            return chromadb.CloudClient(
                tenant=tenant, database=database, api_key=cloud_api_key
            )
        except Exception as error:
            logger.error("chroma_cloud_unavailable code=%s", type(error).__name__)
            raise VectorStoreUnavailableError("Configured Chroma Cloud is unavailable.") from error

    host = os.getenv("CHROMA_SERVER_HOST", "localhost")
    port = int(os.getenv("CHROMA_SERVER_HTTP_PORT", "8000"))
    try:
        client = chromadb.HttpClient(host=host, port=port)
        client.get_user_identity()
        return client
    except Exception as error:
        logger.error(
            "chroma_server_unavailable host=%s port=%s code=%s",
            host,
            port,
            type(error).__name__,
        )
        raise VectorStoreUnavailableError("Configured Chroma server is unavailable.") from error


def get_active_collection_name() -> str:
    """Return collection name based on env CHUNKING_COLLECTION (v1 or v2)."""
    return os.getenv("CHUNKING_COLLECTION", COLLECTION_V2)


def get_or_create_collection(client: Any, collection_name: str | None = None) -> Any:
    """Return a cosine-distance Chroma collection for the configured index."""
    target_name = collection_name or get_active_collection_name()
    return client.get_or_create_collection(
        name=target_name,
        metadata={"hnsw:space": "cosine"},
    )


def store_document_chunks(
    workspace_id: str,
    document_id: str,
    chunks: list[ChunkResult],
    target_collection: str | None = None,
    ingestion_version: int = 1,
    document_content_hash: str = "",
) -> int:
    """Store chunks in ChromaDB with enriched source metadata.

    Args:
        workspace_id: Owning workspace identifier.
        document_id: Source document identifier.
        chunks: Pre-chunked text segments with locator metadata.
        target_collection: Override the default ChromaDB collection name.
        ingestion_version: The document's current ingestion version integer from Core API.
        document_content_hash: SHA-256 hex digest of the full document file.
    """
    if not chunks:
        return 0

    client = get_chroma_client()
    col_name = target_collection or get_active_collection_name()
    collection = get_or_create_collection(client, collection_name=col_name)
    model = get_embedding_model()

    ids: list[str] = []
    documents: list[str] = []
    embeddings: list[list[float]] = []
    metadatas: list[dict[str, Any]] = []

    for chunk in chunks:
        chunk_id = f"{document_id}_{chunk.chunk_index}"
        heading = chunk.section_heading
        passage_context = f"{heading}\n" if heading and not chunk.text.startswith(heading) else ""
        prefixed_text = f"passage: {passage_context}{chunk.text}"
        embedding = model.encode(prefixed_text).tolist()

        ids.append(chunk_id)
        documents.append(chunk.text)
        embeddings.append(embedding)

        meta: dict[str, Any] = {
            "workspace_id": workspace_id,
            "document_id": document_id,
            "chunk_index": chunk.chunk_index,
            "locator_type": chunk.locator_type,
            "locator_value": chunk.locator_value,
            "content_hash": chunk.content_hash,
            # R-03: Additional metadata fields for retrieval filter
            "document_status": "PROCESSED",
            "ingestion_version": ingestion_version,
            "document_content_hash": document_content_hash,
            # R-19: source_group = document_id for P0
            "source_group": document_id,
            "chunking_version": CHUNKING_VERSION,
        }
        if chunk.section_heading:
            meta["section_heading"] = chunk.section_heading

        metadatas.append(meta)

    collection.add(
        ids=ids,
        documents=documents,
        embeddings=embeddings,
        metadatas=metadatas,
    )

    return len(chunks)
