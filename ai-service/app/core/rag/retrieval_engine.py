import logging
from dataclasses import dataclass
from typing import Any, cast

from chromadb.errors import NotFoundError

from app.core.rag.contracts import SourceVersion
from app.core.rag.strategy_selector import RetrievalStrategy
from app.services.vector_store import COLLECTION_V1, COLLECTION_V2
from app.services.vector_store import get_active_collection_name as get_active_collection_name
from app.services.vector_store import get_chroma_client as get_chroma_client
from app.services.vector_store import get_embedding_model as get_embedding_model

logger = logging.getLogger(__name__)
MAX_SOURCE_OVERFETCH = 100


@dataclass(eq=False)
class RetrievedChunkCandidate:
    """Authorized source chunk and its current retrieval provenance."""

    chunk_id: str
    document_id: str
    text: str
    similarity: float
    locator_type: str
    locator_value: str
    content_hash: str
    ingestion_version: int | None = None
    document_content_hash: str | None = None
    section_heading: str | None = None
    chunk_index: int | None = None
    chunking_version: str | None = None


def retrieve_chunks(
    workspace_id: str, allowed_document_ids: list[str], question: str,
    strategy: RetrievalStrategy, contextual_query: str | None = None,
    query_variants: list[str] | None = None, sources: list[SourceVersion] | None = None,
) -> list[RetrievedChunkCandidate]:
    """Retrieve all query variants under one Core-provided source snapshot."""
    if not allowed_document_ids or strategy.top_k == 0:
        return []
    source_filter = build_source_filter(workspace_id, allowed_document_ids, sources)
    if source_filter is None:
        return []

    client = get_chroma_client()
    col_name = get_active_collection_name()
    queries = _unique_queries(question, contextual_query, query_variants)
    collection = _get_collection(client, col_name)
    query_embeddings = _embed_queries(queries) if collection is not None else None
    candidates = _query_if_available(
        collection, source_filter, workspace_id, allowed_document_ids,
        query_embeddings, strategy, sources,
    )
    if len(candidates) < strategy.max_chunks and col_name == COLLECTION_V2:
        candidates = _append_v1_candidates(
            client, candidates, queries, query_embeddings, source_filter,
            workspace_id, allowed_document_ids, strategy, sources,
        )
    candidates.sort(key=lambda item: (-item.similarity, item.chunk_id))
    return diversify_candidates(candidates, strategy.max_chunks)


def diversify_candidates(
    ranked: list[RetrievedChunkCandidate], limit: int
) -> list[RetrievedChunkCandidate]:
    """Select top candidates while spreading slots across distinct authorized documents."""
    if limit <= 0 or len(ranked) <= limit:
        return ranked[: max(0, limit)]
    selected_ids: set[str] = set()
    doc_counts: dict[str, int] = {}
    while len(selected_ids) < limit:
        best = min(
            (item for item in ranked if item.chunk_id not in selected_ids),
            key=lambda item: doc_counts.get(item.document_id, 0),
            default=None,
        )
        if best is None:
            break
        selected_ids.add(best.chunk_id)
        doc_counts[best.document_id] = doc_counts.get(best.document_id, 0) + 1
    return [item for item in ranked if item.chunk_id in selected_ids]


def _query_if_available(
    collection: Any | None, source_filter: dict[str, object], workspace_id: str,
    allowed_document_ids: list[str], query_embeddings: list[list[float]] | None,
    strategy: RetrievalStrategy, sources: list[SourceVersion] | None,
) -> list[RetrievedChunkCandidate]:
    if collection is None or query_embeddings is None:
        return []
    return _query_collection(
        collection, source_filter, workspace_id, allowed_document_ids,
        query_embeddings, strategy, sources,
    )


def _append_v1_candidates(
    client: Any, candidates: list[RetrievedChunkCandidate], queries: list[str],
    query_embeddings: list[list[float]] | None, source_filter: dict[str, object],
    workspace_id: str, allowed_document_ids: list[str],
    strategy: RetrievalStrategy, sources: list[SourceVersion] | None,
) -> list[RetrievedChunkCandidate]:
    collection = _get_collection(client, COLLECTION_V1)
    if collection is None:
        return candidates
    embeddings = query_embeddings or _embed_queries(queries)
    legacy = _query_collection(
        collection, source_filter, workspace_id, allowed_document_ids,
        embeddings, strategy, sources,
    )
    return _merge_unique(candidates, legacy)


def _merge_unique(
    primary: list[RetrievedChunkCandidate], fallback: list[RetrievedChunkCandidate]
) -> list[RetrievedChunkCandidate]:
    merged = list(primary)
    seen_ids = {candidate.chunk_id for candidate in primary}
    for candidate in fallback:
        if candidate.chunk_id not in seen_ids:
            merged.append(candidate)
            seen_ids.add(candidate.chunk_id)
    return merged


def build_source_filter(
    workspace_id: str, allowed_document_ids: list[str], sources: list[SourceVersion] | None,
) -> dict[str, object] | None:
    """Build the shared Chroma authorization and current-source filter."""
    common: list[dict[str, object]] = [
        {"workspace_id": {"$eq": workspace_id}},
        {"document_status": {"$eq": "PROCESSED"}},
        {"document_id": {"$in": allowed_document_ids}},
    ]
    return {"$and": common}


def _unique_queries(
    question: str, contextual_query: str | None, query_variants: list[str] | None
) -> list[str]:
    queries: list[str] = []
    for value in [question, *(query_variants or []), contextual_query or ""]:
        query = value.strip()
        if query and query.casefold() not in {item.casefold() for item in queries}:
            queries.append(query)
    return queries


def _get_collection(client: Any, collection_name: str) -> Any | None:
    try:
        return client.get_collection(name=collection_name)
    except NotFoundError:
        return None


def _embed_queries(queries: list[str]) -> list[list[float]]:
    model = get_embedding_model()
    return model.encode([f"query: {query}" for query in queries]).tolist()


def _query_collection(
    collection: Any, source_filter: dict[str, object], workspace_id: str,
    allowed_document_ids: list[str], query_embeddings: list[list[float]],
    strategy: RetrievalStrategy, sources: list[SourceVersion] | None,
) -> list[RetrievedChunkCandidate]:
    multiplier = 3 if len(allowed_document_ids) > 1 else 1
    query_size = min(max(strategy.top_k, strategy.max_chunks * multiplier), MAX_SOURCE_OVERFETCH)
    while True:
        results = _execute_collection_query(collection, query_embeddings, query_size, source_filter)
        candidates = _candidates_by_best_query(
            results, strategy.similarity_floor, workspace_id, allowed_document_ids, sources
        )
        if _should_stop_overfetch(
            candidates, results, query_size, len(query_embeddings),
            len(allowed_document_ids), strategy.max_chunks, sources,
        ):
            ranked = sorted(candidates.values(), key=lambda c: (-c.similarity, c.chunk_id))
            return diversify_candidates(ranked, strategy.max_chunks)
        query_size = min(query_size * 2, MAX_SOURCE_OVERFETCH)


def _should_stop_overfetch(
    candidates: dict[str, RetrievedChunkCandidate], results: dict[str, Any],
    query_size: int, query_count: int, allowed_doc_count: int,
    max_chunks: int, sources: list[SourceVersion] | None,
) -> bool:
    if sources is None or query_size >= MAX_SOURCE_OVERFETCH:
        return True
    if sum(len(ids) for ids in results.get("ids") or []) < query_size * query_count:
        return True
    if len(candidates) < max_chunks:
        return False
    return allowed_doc_count <= 1 or len({c.document_id for c in candidates.values()}) >= 2


def _execute_collection_query(
    collection: Any, query_embeddings: list[list[float]],
    query_size: int, source_filter: dict[str, object],
) -> dict[str, Any]:
    try:
        return cast(
            dict[str, Any],
            collection.query(
                query_embeddings=query_embeddings, n_results=query_size, where=source_filter
            ),
        )
    except Exception as error:
        status_code = getattr(error, "status_code", None)
        logger.error(
            "chroma_retrieval_query_failed",
            extra={
                "operation": "dense_retrieval",
                "http_status": status_code if isinstance(status_code, int) else None,
                "error_code": type(error).__name__,
                "filter_shape": "flat_workspace_status_document_allowlist",
            },
        )
        raise


def _candidates_by_best_query(
    results: dict[str, Any], similarity_floor: float, workspace_id: str,
    allowed_document_ids: list[str], sources: list[SourceVersion] | None,
) -> dict[str, RetrievedChunkCandidate]:
    candidates: dict[str, RetrievedChunkCandidate] = {}
    ids_by_query = results.get("ids") or []
    for query_index, ids in enumerate(ids_by_query):
        for index, chunk_id in enumerate(ids):
            metadata = _query_value(results, "metadatas", query_index, index, {}) or {}
            if not is_current_metadata(metadata, workspace_id, allowed_document_ids, sources):
                continue
            candidate = _candidate_at(results, query_index, index, chunk_id, metadata)
            if candidate.similarity >= similarity_floor:
                current = candidates.get(chunk_id)
                if current is None or candidate.similarity > current.similarity:
                    candidates[chunk_id] = candidate
    return candidates


def _candidate_at(
    results: dict[str, Any], query_index: int, index: int,
    chunk_id: str, metadata: dict[str, Any],
) -> RetrievedChunkCandidate:
    dist = _query_value(results, "distances", query_index, index, 1.0)
    raw_index = metadata.get("chunk_index")
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
        chunk_index=raw_index if type(raw_index) is int else None,
        chunking_version=metadata.get("chunking_version"),
    )


def is_current_metadata(
    metadata: dict[str, Any], workspace_id: str,
    allowed_document_ids: list[str], sources: list[SourceVersion] | None,
) -> bool:
    """Return whether Chroma metadata matches the authorized current snapshot."""
    if metadata.get("workspace_id") != workspace_id:
        return False
    if metadata.get("document_status") != "PROCESSED":
        return False
    document_id = metadata.get("document_id")
    if document_id not in set(allowed_document_ids):
        return False
    if sources is None:
        return True
    current = {str(source.documentId): source for source in sources}.get(document_id)
    return current is not None and (
        metadata.get("ingestion_version") == current.ingestionVersion
        and metadata.get("document_content_hash") == current.contentHash
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
