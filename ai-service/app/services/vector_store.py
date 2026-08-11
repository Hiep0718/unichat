import logging
import os
from typing import Any

import chromadb
from sentence_transformers import SentenceTransformer

from app.services.chunker import ChunkResult

logger = logging.getLogger(__name__)

EMBEDDING_MODEL_NAME = "intfloat/multilingual-e5-base"
COLLECTION_V1 = "unichat_chunks_v1"
COLLECTION_V2 = "unichat_chunks_v2"
COLLECTION_NAME = COLLECTION_V2

_model: SentenceTransformer | None = None
_ephemeral_client: Any = None


def get_embedding_model() -> SentenceTransformer:
    global _model
    if _model is None:
        _model = SentenceTransformer(EMBEDDING_MODEL_NAME)
    return _model


def get_chroma_client() -> Any:
    global _ephemeral_client
    mode = os.getenv("CHROMA_MODE", "auto")
    if mode == "ephemeral":
        if _ephemeral_client is None:
            _ephemeral_client = chromadb.EphemeralClient()
        return _ephemeral_client

    host = os.getenv("CHROMA_SERVER_HOST", "localhost")
    port = int(os.getenv("CHROMA_SERVER_HTTP_PORT", "8000"))
    try:
        client = chromadb.HttpClient(host=host, port=port)
        client.get_user_identity()
        return client
    except Exception as e:
        logger.warning(
            "Could not connect to Chroma server at %s:%s (%s). Falling back to EphemeralClient.",
            host,
            port,
            e,
        )
        if _ephemeral_client is None:
            _ephemeral_client = chromadb.EphemeralClient()
        return _ephemeral_client


def get_active_collection_name() -> str:
    """Return collection name based on env CHUNKING_COLLECTION (v1 or v2)."""
    return os.getenv("CHUNKING_COLLECTION", COLLECTION_V2)


def get_or_create_collection(client: Any, collection_name: str | None = None) -> Any:
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
) -> int:
    """Store document chunks into specified ChromaDB collection with enriched metadata (R-03, R-18, R-19)."""
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
        prefixed_text = f"passage: {chunk.text}"
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
            "ingestion_version": "v2.0",
            # R-19: source_group = document_id for P0
            "source_group": document_id,
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
