from typing import Any

from chromadb.errors import NotFoundError

from app.core.rag.strategy_selector import RetrievalStrategy
from app.services.vector_store import (
    COLLECTION_V1,
    COLLECTION_V2,
    get_active_collection_name,
    get_chroma_client,
    get_embedding_model,
)


class RetrievedChunkCandidate:
    """Authorized source chunk and its current retrieval provenance."""

    def __init__(
        self,
        chunk_id: str,
        document_id: str,
        text: str,
        similarity: float,
        locator_type: str,
        locator_value: str,
        content_hash: str,
        ingestion_version: int | None = None,
        document_content_hash: str | None = None,
        section_heading: str | None = None,
    ) -> None:
        self.chunk_id = chunk_id
        self.document_id = document_id
        self.text = text
        self.similarity = similarity
        self.locator_type = locator_type
        self.locator_value = locator_value
        self.content_hash = content_hash
        self.ingestion_version = ingestion_version
        self.document_content_hash = document_content_hash
        self.section_heading = section_heading


def retrieve_chunks(
    workspace_id: str,
    allowed_document_ids: list[str],
    question: str,
    strategy: RetrievalStrategy,
    contextual_query: str | None = None,
) -> list[RetrievedChunkCandidate]:
    """Retrieve candidates from original and optional contextual queries.

    Every query shares the same Core-provided document allowlist and workspace filter.
    """
    if not allowed_document_ids or strategy.top_k == 0:
        return []

    client = get_chroma_client()
    col_name = get_active_collection_name()
    queries = [question]
    if contextual_query and contextual_query.strip() != question.strip():
        queries.append(contextual_query)
    collection = _get_collection(client, col_name)
    query_embeddings = _embed_queries(queries) if collection is not None else None
    candidates = (
        _query_collection(
            collection, workspace_id, allowed_document_ids, query_embeddings, strategy
        )
        if collection is not None and query_embeddings is not None
        else []
    )

    if len(candidates) < strategy.max_chunks and col_name == COLLECTION_V2:
        v1_collection = _get_collection(client, COLLECTION_V1)
        if v1_collection is None:
            v1_candidates = []
        else:
            query_embeddings = query_embeddings or _embed_queries(queries)
            v1_candidates = _query_collection(
                v1_collection, workspace_id, allowed_document_ids, query_embeddings, strategy
            )
        seen_keys = {c.chunk_id for c in candidates}
        for c in v1_candidates:
            if c.chunk_id not in seen_keys:
                candidates.append(c)
                seen_keys.add(c.chunk_id)

    candidates.sort(key=lambda c: c.similarity, reverse=True)
    return candidates[: strategy.max_chunks]


def _get_collection(client: Any, collection_name: str) -> Any | None:
    try:
        return client.get_collection(name=collection_name)
    except NotFoundError:
        return None


def _embed_queries(queries: list[str]) -> list[list[float]]:
    model = get_embedding_model()
    return model.encode([f"query: {query}" for query in queries]).tolist()


def _query_collection(
    collection: Any,
    workspace_id: str,
    allowed_document_ids: list[str],
    query_embeddings: list[list[float]],
    strategy: RetrievalStrategy,
) -> list[RetrievedChunkCandidate]:
    results = collection.query(
        query_embeddings=query_embeddings,
        n_results=strategy.top_k,
        where={
            "$and": [
                {"workspace_id": {"$eq": workspace_id}},
                {"document_id": {"$in": allowed_document_ids}},
                {"document_status": {"$eq": "PROCESSED"}},
            ]
        },
    )

    candidates = _candidates_by_best_query(results, strategy.similarity_floor)
    return sorted(candidates.values(), key=lambda item: item.similarity, reverse=True)[
        : strategy.max_chunks
    ]


def _candidates_by_best_query(
    results: dict[str, Any], similarity_floor: float
) -> dict[str, RetrievedChunkCandidate]:
    candidates: dict[str, RetrievedChunkCandidate] = {}
    ids_by_query = results.get("ids") or []
    for query_index, ids in enumerate(ids_by_query):
        for index, chunk_id in enumerate(ids):
            candidate = _candidate_at(results, query_index, index, chunk_id)
            if candidate.similarity >= similarity_floor:
                current = candidates.get(chunk_id)
                if current is None or candidate.similarity > current.similarity:
                    candidates[chunk_id] = candidate
    return candidates


def _candidate_at(
    results: dict[str, Any], query_index: int, index: int, chunk_id: str
) -> RetrievedChunkCandidate:
    dist = _query_value(results, "distances", query_index, index, 1.0)
    metadata = _query_value(results, "metadatas", query_index, index, {}) or {}
    return RetrievedChunkCandidate(
        chunk_id=chunk_id,
        document_id=metadata.get("document_id", ""),
        text=_query_value(results, "documents", query_index, index, ""),
        similarity=1.0 - dist if dist <= 1.0 else 0.0,
        locator_type=metadata.get("locator_type", "UNKNOWN"),
        locator_value=metadata.get("locator_value", ""),
        content_hash=metadata.get("content_hash", ""),
        ingestion_version=_source_version(metadata.get("ingestion_version")),
        document_content_hash=metadata.get("document_content_hash"),
        section_heading=metadata.get("section_heading"),
    )


def _query_value(
    results: dict[str, Any], field: str, query_index: int, index: int, default: Any
) -> Any:
    rows = results.get(field) or []
    if query_index >= len(rows) or index >= len(rows[query_index]):
        return default
    return rows[query_index][index]


def _source_version(value: object) -> int | None:
    # Vector schema labels such as v2.0 cannot prove a document ingestion version.
    return value if type(value) is int and value > 0 else None
