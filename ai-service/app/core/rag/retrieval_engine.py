from typing import Any

from app.core.rag.strategy_selector import RetrievalStrategy
from app.services.vector_store import (
    COLLECTION_V1,
    COLLECTION_V2,
    get_active_collection_name,
    get_chroma_client,
    get_embedding_model,
)


class RetrievedChunkCandidate:
    def __init__(
        self,
        chunk_id: str,
        document_id: str,
        text: str,
        similarity: float,
        locator_type: str,
        locator_value: str,
        content_hash: str,
    ) -> None:
        self.chunk_id = chunk_id
        self.document_id = document_id
        self.text = text
        self.similarity = similarity
        self.locator_type = locator_type
        self.locator_value = locator_value
        self.content_hash = content_hash

def retrieve_chunks(
    workspace_id: str,
    allowed_document_ids: list[str],
    question: str,
    strategy: RetrievalStrategy,
) -> list[RetrievedChunkCandidate]:
    if not allowed_document_ids or strategy.top_k == 0:
        return []

    client = get_chroma_client()
    col_name = get_active_collection_name()

    candidates = _query_single_collection(client, col_name, workspace_id, allowed_document_ids, question, strategy)
    if not candidates and col_name == COLLECTION_V2:
        candidates = _query_single_collection(client, COLLECTION_V1, workspace_id, allowed_document_ids, question, strategy)

    return candidates[: strategy.max_chunks]


def _query_single_collection(
    client: Any,
    collection_name: str,
    workspace_id: str,
    allowed_document_ids: list[str],
    question: str,
    strategy: RetrievalStrategy,
) -> list[RetrievedChunkCandidate]:
    try:
        collection = client.get_collection(name=collection_name)
    except Exception:
        return []

    model = get_embedding_model()
    # Add query: prefix per E5 model specification
    query_text = f"query: {question}"
    query_embedding = model.encode(query_text).tolist()

    # Query ChromaDB with document_id and document_status filter
    results = collection.query(
        query_embeddings=[query_embedding],
        n_results=strategy.top_k,
        where={
            "$and": [
                {"workspace_id": {"$eq": workspace_id}},
                {"document_id": {"$in": allowed_document_ids}},
                {"document_status": {"$eq": "PROCESSED"}},
            ]
        },
    )

    candidates: list[RetrievedChunkCandidate] = []
    if not results or not results.get("ids") or not results["ids"][0]:
        return candidates

    ids = results["ids"][0]
    docs = results["documents"][0] if results.get("documents") else []
    distances = results["distances"][0] if results.get("distances") else []
    metadatas = results["metadatas"][0] if results.get("metadatas") else []

    for i in range(len(ids)):
        dist = distances[i] if i < len(distances) else 1.0
        # Cosine similarity = 1.0 - cosine distance
        similarity = 1.0 - dist if dist <= 1.0 else 0.0

        if similarity >= strategy.similarity_floor:
            meta: dict[str, Any] = metadatas[i] if i < len(metadatas) else {}
            candidates.append(
                RetrievedChunkCandidate(
                    chunk_id=ids[i],
                    document_id=meta.get("document_id", ""),
                    text=docs[i] if i < len(docs) else "",
                    similarity=similarity,
                    locator_type=meta.get("locator_type", "UNKNOWN"),
                    locator_value=meta.get("locator_value", ""),
                    content_hash=meta.get("content_hash", ""),
                )
            )

    return candidates[: strategy.max_chunks]
