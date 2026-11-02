"""Deterministic read-only lexical candidate retrieval from Chroma documents."""

import re
import unicodedata
from typing import Any

from chromadb.errors import NotFoundError

from app.core.rag import retrieval_engine
from app.core.rag.contracts import SourceVersion
from app.core.rag.retrieval_engine import (
    RetrievedChunkCandidate,
    build_source_filter,
    is_current_metadata,
)

MAX_LEXICAL_TERMS = 8
MAX_LEXICAL_FETCH = 20
MIN_LEXICAL_SCORE = 0.30
_STOP_TERMS = frozenset({
    "about", "and", "are", "cac", "các", "cap", "cập", "cho", "co", "có",
    "cua", "của", "de", "đề", "den", "đến", "do", "đó", "duoc", "được",
    "for", "from", "gi", "gì", "gom", "gồm", "hay", "hoac", "hoặc", "how",
    "in", "ke", "kê", "khi", "la", "là", "liet", "liệt", "lieu", "liệu",
    "mot", "một", "nao", "nào", "nay", "này", "neu", "nếu", "nhu", "như",
    "nhung", "những", "of", "tai", "tài", "the", "theo", "thi", "thì",
    "to", "tren", "trên", "trong", "tu", "từ", "va", "và", "ve", "về",
    "voi", "với", "what", "with",
})


def retrieve_lexical_chunks(
    workspace_id: str,
    allowed_document_ids: list[str],
    queries: list[str],
    sources: list[SourceVersion],
    limit: int,
) -> list[RetrievedChunkCandidate]:
    """Return bounded exact-term candidates under the current source snapshot."""
    if limit <= 0 or not allowed_document_ids:
        return []
    terms = _lexical_terms(queries)
    source_filter = build_source_filter(workspace_id, allowed_document_ids, sources)
    if not terms or source_filter is None:
        return []
    collection = _get_collection()
    if collection is None:
        return []
    candidates: dict[str, RetrievedChunkCandidate] = {}
    for term in terms:
        result = collection.get(
            where=source_filter,
            where_document={"$contains": term},
            include=["documents", "metadatas"],
            limit=MAX_LEXICAL_FETCH,
        )
        _collect_candidates(
            result, queries, workspace_id, allowed_document_ids, sources, candidates
        )
    ranked = sorted(candidates.values(), key=lambda item: (-item.similarity, item.chunk_id))
    return ranked[:limit]


def _get_collection() -> Any | None:
    client = retrieval_engine.get_chroma_client()
    try:
        return client.get_collection(name=retrieval_engine.get_active_collection_name())
    except NotFoundError:
        return None


def _lexical_terms(queries: list[str]) -> list[str]:
    terms: list[str] = []
    normalized_terms: set[str] = set()
    for query in queries:
        normalized = unicodedata.normalize("NFC", query)
        for token in re.findall(r"[^\W_]+", normalized, flags=re.UNICODE):
            folded = token.casefold()
            if len(folded) < 2 or folded in _STOP_TERMS or folded in normalized_terms:
                continue
            terms.append(token)
            normalized_terms.add(folded)
            if len(terms) == MAX_LEXICAL_TERMS:
                return terms
    return terms


def _collect_candidates(
    result: dict[str, Any],
    queries: list[str],
    workspace_id: str,
    allowed_document_ids: list[str],
    sources: list[SourceVersion],
    candidates: dict[str, RetrievedChunkCandidate],
) -> None:
    identifiers = result.get("ids") or []
    documents = result.get("documents") or []
    metadatas = result.get("metadatas") or []
    for index, chunk_id in enumerate(identifiers):
        metadata = metadatas[index] if index < len(metadatas) else {}
        if not is_current_metadata(metadata, workspace_id, allowed_document_ids, sources):
            continue
        text = documents[index] if index < len(documents) else ""
        score = _lexical_score(text, queries)
        if score < MIN_LEXICAL_SCORE:
            continue
        candidate = _candidate(chunk_id, text, metadata, score)
        current = candidates.get(chunk_id)
        if current is None or candidate.similarity > current.similarity:
            candidates[chunk_id] = candidate


def _candidate(
    chunk_id: str, text: str, metadata: dict[str, Any], score: float
) -> RetrievedChunkCandidate:
    chunk_index = metadata.get("chunk_index")
    return RetrievedChunkCandidate(
        chunk_id=chunk_id,
        document_id=metadata.get("document_id", ""),
        text=text,
        similarity=score,
        locator_type=metadata.get("locator_type", "UNKNOWN"),
        locator_value=metadata.get("locator_value", ""),
        content_hash=metadata.get("content_hash", ""),
        ingestion_version=metadata.get("ingestion_version"),
        document_content_hash=metadata.get("document_content_hash"),
        section_heading=metadata.get("section_heading"),
        chunk_index=chunk_index if type(chunk_index) is int else None,
        chunking_version=metadata.get("chunking_version"),
    )


def _lexical_score(text: str, queries: list[str]) -> float:
    normalized_text = " ".join(unicodedata.normalize("NFC", text).casefold().split())
    scores = [_query_overlap(normalized_text, query) for query in queries]
    return max(scores, default=0.0)


def _query_overlap(normalized_text: str, query: str) -> float:
    terms = _lexical_terms([query])
    if not terms:
        return 0.0
    normalized_query = " ".join(unicodedata.normalize("NFC", query).casefold().split())
    if len(terms) >= 2 and normalized_query and normalized_query in normalized_text:
        return 1.0
    text_tokens = set(re.findall(r"[^\W_]+", normalized_text, flags=re.UNICODE))
    return sum(term.casefold() in text_tokens for term in terms) / len(terms)
