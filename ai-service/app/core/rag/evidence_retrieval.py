"""Orchestrate bounded per-facet retrieval, coverage and same-source expansion."""

from dataclasses import dataclass

from app.core.rag.context_expansion import expand_same_document_neighbors
from app.core.rag.contracts import SourceVersion
from app.core.rag.evidence_coverage import EvidenceCoverage, assess_facet_coverage
from app.core.rag.evidence_ranking import (
    MAX_EVIDENCE_CHUNKS,
    fuse_candidate_lists,
    reciprocal_rank_fusion,
)
from app.core.rag.lexical_retrieval import retrieve_lexical_chunks
from app.core.rag.provider_contracts import Cancellation, check_cancelled
from app.core.rag.question_plan import AnswerFacet, QuestionPlan
from app.core.rag.retrieval_engine import RetrievedChunkCandidate, retrieve_chunks
from app.core.rag.strategy_selector import RetrievalStrategy

NEIGHBOR_CONTEXT_RESERVE = 2


@dataclass(frozen=True)
class RetrievedEvidence:
    """Selected direct evidence, expanded context and per-facet coverage."""

    candidates: list[RetrievedChunkCandidate]
    direct_candidates: list[RetrievedChunkCandidate]
    coverage: EvidenceCoverage


def retrieve_planned_evidence(
    workspace_id: str, allowed_document_ids: list[str], original_question: str,
    plan: QuestionPlan, strategy: RetrievalStrategy, sources: list[SourceVersion],
    contextual_query: str | None = None, cancelled: Cancellation | None = None,
) -> RetrievedEvidence:
    """Retrieve each facet under the same allowlist, then fuse and expand context."""
    by_facet = _retrieve_facets(
        workspace_id, allowed_document_ids, plan, strategy, sources, cancelled
    )
    by_facet = _retry_uncovered_facets(
        workspace_id, allowed_document_ids, plan, strategy, sources, by_facet, cancelled
    )
    coverage = assess_facet_coverage(plan, by_facet)
    check_cancelled(cancelled)
    general = _retrieve_general(
        workspace_id, allowed_document_ids, original_question, contextual_query,
        strategy, sources,
    )
    direct_limit = min(MAX_EVIDENCE_CHUNKS, max(strategy.max_chunks, len(plan.facets)))
    direct = reciprocal_rank_fusion(by_facet, general, direct_limit)
    check_cancelled(cancelled)
    neighbor_limit = min(
        NEIGHBOR_CONTEXT_RESERVE, max(0, MAX_EVIDENCE_CHUNKS - len(direct))
    )
    neighbors = expand_same_document_neighbors(
        workspace_id, allowed_document_ids, direct, sources, neighbor_limit
    )
    candidates = _append_unique_neighbors(direct, neighbors)
    return RetrievedEvidence(candidates[:MAX_EVIDENCE_CHUNKS], direct, coverage)


def _retrieve_facets(
    workspace_id: str,
    allowed_document_ids: list[str],
    plan: QuestionPlan,
    strategy: RetrievalStrategy,
    sources: list[SourceVersion],
    cancelled: Cancellation | None,
) -> dict[str, list[RetrievedChunkCandidate]]:
    results: dict[str, list[RetrievedChunkCandidate]] = {}
    for facet in plan.facets:
        check_cancelled(cancelled)
        results[facet.facet_id] = _retrieve_facet(
            workspace_id, allowed_document_ids, facet, strategy, sources
        )
    return results


def _retrieve_facet(
    workspace_id: str,
    allowed_document_ids: list[str],
    facet: AnswerFacet,
    strategy: RetrievalStrategy,
    sources: list[SourceVersion],
) -> list[RetrievedChunkCandidate]:
    return _retrieve_queries(
        workspace_id, allowed_document_ids, [facet.query], strategy, sources
    )


def _retrieve_queries(
    workspace_id: str,
    allowed_document_ids: list[str],
    queries: list[str],
    strategy: RetrievalStrategy,
    sources: list[SourceVersion],
) -> list[RetrievedChunkCandidate]:
    dense = retrieve_chunks(
        workspace_id, allowed_document_ids, queries[0], strategy,
        query_variants=queries[1:], sources=sources,
    )
    lexical = retrieve_lexical_chunks(
        workspace_id, allowed_document_ids, queries, sources, strategy.max_chunks
    )
    return fuse_candidate_lists([dense, lexical], strategy.max_chunks)


def _retry_uncovered_facets(
    workspace_id: str,
    allowed_document_ids: list[str],
    plan: QuestionPlan,
    strategy: RetrievalStrategy,
    sources: list[SourceVersion],
    results: dict[str, list[RetrievedChunkCandidate]],
    cancelled: Cancellation | None,
) -> dict[str, list[RetrievedChunkCandidate]]:
    retried = dict(results)
    for facet in plan.facets:
        if retried.get(facet.facet_id) or not facet.query_variants:
            continue
        check_cancelled(cancelled)
        retried[facet.facet_id] = _retrieve_queries(
            workspace_id, allowed_document_ids, facet.query_variants, strategy, sources
        )
    return retried


def _retrieve_general(
    workspace_id: str,
    allowed_document_ids: list[str],
    question: str,
    contextual_query: str | None,
    strategy: RetrievalStrategy,
    sources: list[SourceVersion],
) -> list[RetrievedChunkCandidate]:
    queries = [question, *([contextual_query] if contextual_query else [])]
    dense = retrieve_chunks(
        workspace_id, allowed_document_ids, question, strategy,
        contextual_query=contextual_query, sources=sources,
    )
    lexical = retrieve_lexical_chunks(
        workspace_id, allowed_document_ids, queries, sources, strategy.max_chunks
    )
    return fuse_candidate_lists([dense, lexical], strategy.max_chunks)


def _append_unique_neighbors(
    direct: list[RetrievedChunkCandidate], neighbors: list[RetrievedChunkCandidate]
) -> list[RetrievedChunkCandidate]:
    selected_ids = {candidate.chunk_id for candidate in direct}
    return [*direct, *(item for item in neighbors if item.chunk_id not in selected_ids)]
