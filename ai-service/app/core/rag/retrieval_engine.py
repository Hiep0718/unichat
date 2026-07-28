from typing import Any, Dict, List
from app.services.vector_store import get_chroma_client, get_embedding_model, COLLECTION_NAME
from app.core.rag.strategy_selector import RetrievalStrategy

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
    ):
        self.chunk_id = chunk_id
        self.document_id = document_id
        self.text = text
        self.similarity = similarity
        self.locator_type = locator_type
        self.locator_value = locator_value
        self.content_hash = content_hash

def retrieve_chunks(
    workspace_id: str,
    allowed_document_ids: List[str],
    question: str,
    strategy: RetrievalStrategy,
) -> List[RetrievedChunkCandidate]:
    if not allowed_document_ids or strategy.top_k == 0:
        return []

    client = get_chroma_client()
    try:
        collection = client.get_collection(name=COLLECTION_NAME)
    except Exception:
        return []

    model = get_embedding_model()
    # Add query: prefix per E5 model specification
    query_text = f"query: {question}"
    query_embedding = model.encode(query_text).tolist()

    # Query ChromaDB with document_id filter
    results = collection.query(
        query_embeddings=[query_embedding],
        n_results=strategy.top_k,
        where={
            "$and": [
                {"workspace_id": {"$eq": workspace_id}},
                {"document_id": {"$in": allowed_document_ids}},
            ]
        },
    )

    candidates: List[RetrievedChunkCandidate] = []
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
            meta: Dict[str, Any] = metadatas[i] if i < len(metadatas) else {}
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
