"""Deterministic ranking and bounded evidence packing across planned queries."""

import re
import unicodedata

from app.core.rag.retrieval_engine import RetrievedChunkCandidate

RRF_K = 60
MAX_EVIDENCE_CHUNKS = 16


def reciprocal_rank_fusion(
    results_by_facet: dict[str, list[RetrievedChunkCandidate]],
    general_results: list[RetrievedChunkCandidate],
    limit: int,
) -> list[RetrievedChunkCandidate]:
    """Fuse ranked lists, preserving one direct candidate for each covered facet."""
    ranked_lists = [*results_by_facet.values(), general_results]
    scores, candidates = _fusion_scores(ranked_lists)
    ranked = _ranked_candidates(scores, candidates)
    mandatory_ids = {
        candidate.chunk_id for candidate in _best_per_facet(results_by_facet, candidates)
    }
    return _select_ranked(ranked, mandatory_ids, limit)


def fuse_candidate_lists(
    ranked_lists: list[list[RetrievedChunkCandidate]], limit: int
) -> list[RetrievedChunkCandidate]:
    """Fuse dense and lexical ranks with stable duplicate suppression."""
    scores, candidates = _fusion_scores(ranked_lists)
    ranked = _ranked_candidates(scores, candidates)
    return _select_ranked(ranked, set(), limit)


def _fusion_scores(
    ranked_lists: list[list[RetrievedChunkCandidate]],
) -> tuple[dict[str, float], dict[str, RetrievedChunkCandidate]]:
    scores: dict[str, float] = {}
    candidates: dict[str, RetrievedChunkCandidate] = {}
    for ranked in ranked_lists:
        for rank, candidate in enumerate(ranked, start=1):
            scores[candidate.chunk_id] = scores.get(candidate.chunk_id, 0.0) + 1 / (
                RRF_K + rank
            )
            previous = candidates.get(candidate.chunk_id)
            if previous is None or candidate.similarity > previous.similarity:
                candidates[candidate.chunk_id] = candidate
    return scores, candidates


def _ranked_candidates(
    scores: dict[str, float], candidates: dict[str, RetrievedChunkCandidate]
) -> list[RetrievedChunkCandidate]:
    return sorted(
        candidates.values(),
        key=lambda item: (-scores[item.chunk_id], -item.similarity, item.chunk_id),
    )


def _select_ranked(
    ranked: list[RetrievedChunkCandidate], mandatory_ids: set[str], limit: int
) -> list[RetrievedChunkCandidate]:
    target = max(limit, len(mandatory_ids))
    selected = [item for item in ranked if item.chunk_id in mandatory_ids]
    selected_ids = {item.chunk_id for item in selected}
    excluded_ids = set(selected_ids)
    doc_counts = _document_counts(selected)
    while len(selected) < target:
        candidate = _next_diverse_candidate(ranked, excluded_ids, doc_counts)
        if candidate is None:
            break
        excluded_ids.add(candidate.chunk_id)
        if _duplicates_selected(candidate, selected):
            continue
        selected.append(candidate)
        selected_ids.add(candidate.chunk_id)
        doc_counts[candidate.document_id] = doc_counts.get(candidate.document_id, 0) + 1
    return [item for item in ranked if item.chunk_id in selected_ids]


def _document_counts(candidates: list[RetrievedChunkCandidate]) -> dict[str, int]:
    counts: dict[str, int] = {}
    for candidate in candidates:
        counts[candidate.document_id] = counts.get(candidate.document_id, 0) + 1
    return counts


def _next_diverse_candidate(
    ranked: list[RetrievedChunkCandidate],
    excluded_ids: set[str],
    doc_counts: dict[str, int],
) -> RetrievedChunkCandidate | None:
    return min(
        (item for item in ranked if item.chunk_id not in excluded_ids),
        key=lambda item: doc_counts.get(item.document_id, 0),
        default=None,
    )


def _best_per_facet(
    results_by_facet: dict[str, list[RetrievedChunkCandidate]],
    candidates: dict[str, RetrievedChunkCandidate],
) -> list[RetrievedChunkCandidate]:
    """Reserve each facet's best result before filling the shared context budget."""
    reserved: dict[str, RetrievedChunkCandidate] = {}
    for ranked in results_by_facet.values():
        if ranked:
            candidate = ranked[0]
            reserved[candidate.chunk_id] = candidates[candidate.chunk_id]
    return list(reserved.values())


def _duplicates_selected(
    candidate: RetrievedChunkCandidate, selected: list[RetrievedChunkCandidate]
) -> bool:
    return any(_near_duplicate(candidate.text, item.text) for item in selected)


def _near_duplicate(first: str, second: str) -> bool:
    first_tokens = _normalized_tokens(first)
    second_tokens = _normalized_tokens(second)
    if first_tokens == second_tokens:
        return True
    if min(len(first_tokens), len(second_tokens)) < 8:
        return False
    union = first_tokens | second_tokens
    return bool(union) and len(first_tokens & second_tokens) / len(union) >= 0.9


def _normalized_tokens(text: str) -> set[str]:
    normalized = unicodedata.normalize("NFC", text).casefold()
    return set(re.findall(r"[^\W_]+", normalized, flags=re.UNICODE))
