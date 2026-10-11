"""Match retrieved source provenance against the Core-provided current snapshot."""

import hashlib

from app.core.rag.contracts import CitationItem, SourceVersion
from app.core.rag.retrieval_engine import RetrievedChunkCandidate


class SourceValidationError(ValueError):
    """A source cannot be used without authentic, current retrieval metadata."""


def build_citations(
    candidates: list[RetrievedChunkCandidate], sources: list[SourceVersion], allowed_ids: list[str]
) -> list[CitationItem]:
    """Construct citations only after document version and real chunk hash checks."""
    source_map = {str(source.documentId): source for source in sources}
    citations: list[CitationItem] = []
    for index, candidate in enumerate(candidates, start=1):
        source = source_map.get(candidate.document_id)
        if source is None or candidate.document_id not in allowed_ids:
            raise SourceValidationError("SOURCE_NOT_ALLOWED")
        _check_candidate(candidate, source)
        citations.append(
            CitationItem(
                citationId=str(index),
                documentId=candidate.document_id,
                chunkId=candidate.chunk_id,
                ingestionVersion=source.ingestionVersion,
                contentHash=candidate.content_hash,
                fileName=source.fileName,
                locator=candidate.locator_value,
                excerpt=candidate.text[:200],
                score=candidate.similarity,
            )
        )
    return citations


def _check_candidate(candidate: RetrievedChunkCandidate, source: SourceVersion) -> None:
    from app.core.rag.citation_validator import is_valid_locator

    if not candidate.chunk_id or not candidate.text.strip():
        raise SourceValidationError("CHUNK_METADATA_INVALID")
    if candidate.ingestion_version != source.ingestionVersion:
        raise SourceValidationError("SOURCE_VERSION_INVALID")
    if candidate.document_content_hash != source.contentHash:
        raise SourceValidationError("SOURCE_HASH_INVALID")
    actual = hashlib.sha256(candidate.text.encode("utf-8")).hexdigest()
    if candidate.content_hash != actual or not is_valid_locator(candidate.locator_value):
        raise SourceValidationError("CHUNK_HASH_OR_LOCATOR_INVALID")
