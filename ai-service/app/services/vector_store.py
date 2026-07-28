import logging
import os
from typing import Any

import chromadb
from sentence_transformers import SentenceTransformer

from app.services.chunker import ChunkResult

logger = logging.getLogger(__name__)

EMBEDDING_MODEL_NAME = "intfloat/multilingual-e5-base"
COLLECTION_NAME = "unichat_chunks_v1"

_model: SentenceTransformer | None = None
_ephemeral_client: chromadb.ClientAPI | None = None

def get_embedding_model() -> SentenceTransformer:
    global _model
    if _model is None:
        _model = SentenceTransformer(EMBEDDING_MODEL_NAME)
    return _model

def get_chroma_client() -> chromadb.ClientAPI:
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
        # Ping server identity to verify connection
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

def get_or_create_collection(client: chromadb.ClientAPI) -> Any:
    return client.get_or_create_collection(
        name=COLLECTION_NAME,
        metadata={"hnsw:space": "cosine"},
    )

def store_document_chunks(
    workspace_id: str,
    document_id: str,
    chunks: list[ChunkResult],
) -> int:
    if not chunks:
        return 0

    client = get_chroma_client()
    collection = get_or_create_collection(client)
    model = get_embedding_model()

    ids: list[str] = []
    documents: list[str] = []
    embeddings: list[list[float]] = []
    metadatas: list[dict[str, Any]] = []

    for chunk in chunks:
        chunk_id = f"{document_id}_{chunk.chunk_index}"
        # Add passage: prefix per E5 model specification
        prefixed_text = f"passage: {chunk.text}"
        embedding = model.encode(prefixed_text).tolist()

        ids.append(chunk_id)
        documents.append(chunk.text)
        embeddings.append(embedding)
        metadatas.append({
            "workspace_id": workspace_id,
            "document_id": document_id,
            "chunk_index": chunk.chunk_index,
            "locator_type": chunk.locator_type,
            "locator_value": chunk.locator_value,
            "content_hash": chunk.content_hash,
        })

    collection.add(
        ids=ids,
        documents=documents,
        embeddings=embeddings,
        metadatas=metadatas,
    )

    return len(chunks)
