"""Bounded same-document expansion that preserves each chunk's provenance."""

from typing import Any

from chromadb.errors import NotFoundError

from app.core.rag.contracts import SourceVersion
from app.core.rag.retrieval_engine import RetrievedChunkCandidate
from app.services.chunker import CHUNKING_VERSION
from app.services.vector_store import get_active_collection_name, get_chroma_client

MAX_NEIGHBORS_PER_DOCUMENT = 2
MAX_SECTION_FETCH = 8


def expand_same_document_neighbors(
    workspace_id: str,
    allowed_document_ids: list[str],
    candidates: list[RetrievedChunkCandidate],
    sources: list[SourceVersion],
    max_candidates: int,
) -> list[RetrievedChunkCandidate]:
    """Fetch bounded adjacent chunks without crossing document, workspace or version."""
    if max_candidates <= 0:
        return []
    allowed = set(allowed_document_ids)
    source_map = {str(source.documentId): source for source in sources}
    groups = _neighbor_groups(candidates, allowed, source_map)
    if not groups:
        return []
    collection = _get_collection()
    if collection is None:
        return []
    neighbors: dict[str, RetrievedChunkCandidate] = {}
    for (document_id, version, content_hash, heading), seeds in groups.items():
        indexes = _neighbor_indexes(seeds)
        _read_expansion_candidates(
            collection, workspace_id, document_id, version, content_hash,
            heading, indexes, seeds, neighbors
        )
        if len(neighbors) >= max_candidates:
            break
    ranked = sorted(neighbors.values(), key=_expansion_sort_key)
    return ranked[:max_candidates]


def _get_collection() -> Any | None:
    client = get_chroma_client()
    try:
        return client.get_collection(name=get_active_collection_name())
    except NotFoundError:
        return None


def _read_expansion_candidates(
    collection: Any,
    workspace_id: str,
    document_id: str,
    version: int,
    content_hash: str,
    heading: str | None,
    indexes: list[int],
    seeds: list[RetrievedChunkCandidate],
    neighbors: dict[str, RetrievedChunkCandidate],
) -> None:
    filters = [_neighbor_filter(workspace_id, document_id, version, content_hash, indexes)]
    if heading:
        filters.append(_section_filter(workspace_id, document_id, version, content_hash, heading))
    for position, where in enumerate(filters):
        results = collection.get(
            where=where, include=["documents", "metadatas"], limit=MAX_SECTION_FETCH
        )
        _append_neighbors(
            results, workspace_id, document_id, version, content_hash,
            indexes, heading if position else None, seeds, neighbors
        )


def _neighbor_groups(
    candidates: list[RetrievedChunkCandidate],
    allowed: set[str],
    sources: dict[str, SourceVersion],
) -> dict[tuple[str, int, str, str | None], list[RetrievedChunkCandidate]]:
    groups: dict[tuple[str, int, str, str | None], list[RetrievedChunkCandidate]] = {}
    for candidate in candidates:
        source = sources.get(candidate.document_id)
        if (
            candidate.document_id not in allowed
            or source is None
            or candidate.ingestion_version != source.ingestionVersion
            or candidate.document_content_hash != source.contentHash
            or candidate.chunk_index is None
            or candidate.chunking_version != CHUNKING_VERSION
        ):
            continue
        key = (
            candidate.document_id,
            source.ingestionVersion,
            source.contentHash,
            candidate.section_heading,
        )
        groups.setdefault(key, []).append(candidate)
    return groups


def _neighbor_indexes(seeds: list[RetrievedChunkCandidate]) -> list[int]:
    selected = {seed.chunk_index for seed in seeds}
    neighbors = {
        neighbor
        for seed in seeds
        if seed.chunk_index is not None
        for neighbor in (seed.chunk_index - 1, seed.chunk_index + 1)
        if neighbor >= 0 and neighbor not in selected
    }
    return sorted(neighbors)[:MAX_NEIGHBORS_PER_DOCUMENT]


def _neighbor_filter(
    workspace_id: str,
    document_id: str,
    version: int,
    content_hash: str,
    indexes: list[int],
) -> dict[str, object]:
    filters: list[dict[str, object]] = [
        {"workspace_id": {"$eq": workspace_id}},
        {"document_id": {"$eq": document_id}},
        {"document_status": {"$eq": "PROCESSED"}},
        {"ingestion_version": {"$eq": version}},
        {"document_content_hash": {"$eq": content_hash}},
        {"chunk_index": {"$in": indexes}},
    ]
    return {"$and": filters}


def _section_filter(
    workspace_id: str,
    document_id: str,
    version: int,
    content_hash: str,
    heading: str,
) -> dict[str, object]:
    filters = _base_filters(workspace_id, document_id, version, content_hash)
    filters.append({"section_heading": {"$eq": heading}})
    return {"$and": filters}


def _base_filters(
    workspace_id: str, document_id: str, version: int, content_hash: str
) -> list[dict[str, object]]:
    return [
        {"workspace_id": {"$eq": workspace_id}},
        {"document_id": {"$eq": document_id}},
        {"document_status": {"$eq": "PROCESSED"}},
        {"ingestion_version": {"$eq": version}},
        {"document_content_hash": {"$eq": content_hash}},
    ]


def _append_neighbors(
    results: dict[str, Any],
    workspace_id: str,
    document_id: str,
    version: int,
    content_hash: str,
    indexes: list[int],
    heading: str | None,
    seeds: list[RetrievedChunkCandidate],
    neighbors: dict[str, RetrievedChunkCandidate],
) -> None:
    ids = results.get("ids") or []
    documents = results.get("documents") or []
    metadatas = results.get("metadatas") or []
    seed_scores = {seed.chunk_index: seed.similarity for seed in seeds}
    seed_ids = {seed.chunk_id for seed in seeds}
    for index, chunk_id in enumerate(ids):
        metadata = metadatas[index] if index < len(metadatas) else {}
        text = documents[index] if index < len(documents) else ""
        candidate = _neighbor_candidate(
            chunk_id, text, metadata, workspace_id, document_id, version,
            content_hash, indexes, heading, seed_scores, seed_ids,
        )
        if candidate is not None:
            neighbors[chunk_id] = candidate


def _neighbor_candidate(
    chunk_id: str,
    text: str,
    metadata: dict[str, Any],
    workspace_id: str,
    document_id: str,
    version: int,
    content_hash: str,
    indexes: list[int],
    heading: str | None,
    seed_scores: dict[int | None, float],
    seed_ids: set[str],
) -> RetrievedChunkCandidate | None:
    chunk_index = metadata.get("chunk_index")
    if chunk_id in seed_ids or type(chunk_index) is not int:
        return None
    if not _valid_neighbor(
        metadata, workspace_id, document_id, version, content_hash,
        indexes, heading, chunk_index,
    ):
        return None
    return RetrievedChunkCandidate(
        chunk_id, document_id, text, _neighbor_score(chunk_index, seed_scores),
        metadata.get("locator_type", "UNKNOWN"), metadata.get("locator_value", ""),
        metadata.get("content_hash", ""), version,
        metadata.get("document_content_hash"), metadata.get("section_heading"),
        chunk_index, metadata.get("chunking_version"),
    )


def _neighbor_score(chunk_index: int, seed_scores: dict[int | None, float]) -> float:
    scored = [
        score / (1 + 0.05 * abs(seed_index - chunk_index))
        for seed_index, score in seed_scores.items()
        if seed_index is not None
    ]
    return max(scored, default=0.0)


def _valid_neighbor(
    metadata: dict[str, Any],
    workspace_id: str,
    document_id: str,
    version: int,
    content_hash: str,
    indexes: list[int],
    heading: str | None,
    chunk_index: object,
) -> bool:
    return (
        metadata.get("workspace_id") == workspace_id
        and metadata.get("document_id") == document_id
        and metadata.get("document_status") == "PROCESSED"
        and metadata.get("ingestion_version") == version
        and metadata.get("document_content_hash") == content_hash
        and metadata.get("chunking_version") == CHUNKING_VERSION
        and type(chunk_index) is int
        and (chunk_index in indexes or metadata.get("section_heading") == heading)
    )


def _expansion_sort_key(candidate: RetrievedChunkCandidate) -> tuple[float, int, str]:
    chunk_index = candidate.chunk_index if candidate.chunk_index is not None else 2**31
    return (-candidate.similarity, chunk_index, candidate.chunk_id)
