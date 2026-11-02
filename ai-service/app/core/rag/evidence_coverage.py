"""Measure direct evidence coverage for each planned answer facet."""

from dataclasses import dataclass

from app.core.rag.question_plan import QuestionPlan
from app.core.rag.retrieval_engine import RetrievedChunkCandidate


@dataclass(frozen=True)
class EvidenceCoverage:
    """Stable coverage result used to guide evidence packing and answer limits."""

    covered_facet_ids: tuple[str, ...]
    uncovered_facet_ids: tuple[str, ...]

    @property
    def is_complete(self) -> bool:
        """Return whether every planned facet has at least one direct candidate."""
        return not self.uncovered_facet_ids


def assess_facet_coverage(
    plan: QuestionPlan,
    results_by_facet: dict[str, list[RetrievedChunkCandidate]],
) -> EvidenceCoverage:
    """Count a facet as covered only when its own bounded retrieval found evidence."""
    covered = tuple(
        facet.facet_id for facet in plan.facets if results_by_facet.get(facet.facet_id)
    )
    uncovered = tuple(
        facet.facet_id for facet in plan.facets if not results_by_facet.get(facet.facet_id)
    )
    return EvidenceCoverage(covered, uncovered)
