"""Offline coverage, fusion and authorization tests for planned evidence retrieval."""

import hashlib
from unittest.mock import MagicMock, patch

from app.core.rag.answer_pipeline import complete_answer, prepare_answer
from app.core.rag.context_expansion import expand_same_document_neighbors
from app.core.rag.contracts import RetrievalAnswerRequest
from app.core.rag.evidence_coverage import EvidenceCoverage, assess_facet_coverage
from app.core.rag.evidence_gate import DecisionEnum, EvidenceGateResult
from app.core.rag.evidence_ranking import fuse_candidate_lists, reciprocal_rank_fusion
from app.core.rag.evidence_retrieval import RetrievedEvidence, retrieve_planned_evidence
from app.core.rag.question_plan import AnswerFacet, QuestionPlan
from app.core.rag.question_planner import QuestionPlanningResult
from app.core.rag.retrieval_engine import RetrievedChunkCandidate
from app.core.rag.strategy_selector import RetrievalStrategy
from app.tests.plan_v2_fixtures import (
    DOCUMENT_HASH,
    DOCUMENT_ID,
    candidate,
    payload,
    source,
)

STRATEGY = RetrievalStrategy(5, 0.5, 1, 1, 0.5)


def test_should_report_facets_without_direct_candidates_as_uncovered() -> None:
    plan = QuestionPlan(
        facets=[
            AnswerFacet(facet_id="supported", query="Tài liệu nói gì?", query_variants=[]),
            AnswerFacet(facet_id="missing", query="Tài liệu giải thích tại sao?", query_variants=[]),
        ]
    )

    coverage = assess_facet_coverage(
        plan, {"supported": [candidate()], "missing": []}
    )

    assert coverage.covered_facet_ids == ("supported",)
    assert coverage.uncovered_facet_ids == ("missing",)
    assert not coverage.is_complete


def test_should_fuse_duplicates_and_reserve_evidence_for_each_covered_facet() -> None:
    first = candidate(chunk_id="shared")
    second = candidate(chunk_id="facet-two")
    general = candidate(chunk_id="general")

    results = reciprocal_rank_fusion(
        {"one": [first, general], "two": [second, first]}, [], limit=1
    )

    assert {item.chunk_id for item in results} == {"shared", "facet-two"}


def test_should_suppress_near_duplicates_but_keep_distinct_short_evidence() -> None:
    base_text = "alpha beta gamma delta epsilon zeta eta theta iota kappa lambda"
    near_duplicate = candidate(chunk_id="near", text=f"{base_text} mu")
    distinct_short = candidate(chunk_id="short", text="Bằng chứng khác.")

    results = fuse_candidate_lists(
        [[candidate(chunk_id="base", text=base_text)], [near_duplicate, distinct_short]],
        limit=3,
    )

    assert [item.chunk_id for item in results] == ["base", "short"]


def test_should_retrieve_all_facets_under_the_same_allowlist() -> None:
    plan = QuestionPlan(
        facets=[
            AnswerFacet(facet_id="first", query="Khái niệm là gì?", query_variants=[]),
            AnswerFacet(facet_id="second", query="Vì sao khái niệm quan trọng?", query_variants=[]),
        ]
    )
    first, second = candidate(chunk_id="first"), candidate(chunk_id="second")
    calls: list[tuple[str, list[str]]] = []

    def retrieve(
        workspace: str, allowed: list[str], question: str, *_: object, **__: object
    ) -> list[RetrievedChunkCandidate]:
        calls.append((question, allowed))
        return [first] if question == plan.facets[0].query else [second]

    with (
        patch("app.core.rag.evidence_retrieval.retrieve_chunks", side_effect=retrieve),
        patch("app.core.rag.evidence_retrieval.retrieve_lexical_chunks", return_value=[]),
        patch("app.core.rag.evidence_retrieval.expand_same_document_neighbors", return_value=[]),
    ):
        evidence = retrieve_planned_evidence(
            "workspace-1",
            [DOCUMENT_ID],
            "Khái niệm là gì và vì sao quan trọng?",
            plan,
            STRATEGY,
            [source()],
        )

    assert [query for query, _ in calls] == [
        plan.facets[0].query,
        plan.facets[1].query,
        "Khái niệm là gì và vì sao quan trọng?",
    ]
    assert all(allowed == [DOCUMENT_ID] for _, allowed in calls)
    assert evidence.coverage.is_complete
    assert {item.chunk_id for item in evidence.direct_candidates} == {"first", "second"}


def test_should_retry_one_bounded_variant_for_an_uncovered_facet() -> None:
    plan = QuestionPlan(
        facets=[AnswerFacet(
            facet_id="definition", query="Kiến trúc mono là gì?",
            query_variants=["monolithic architecture"],
        )]
    )
    calls: list[str] = []

    def retrieve(*_: object, **options: object) -> list[RetrievedChunkCandidate]:
        question = str(_[2])
        calls.append(question)
        return [candidate()] if question == "monolithic architecture" else []

    with (
        patch("app.core.rag.evidence_retrieval.retrieve_chunks", side_effect=retrieve),
        patch("app.core.rag.evidence_retrieval.retrieve_lexical_chunks", return_value=[]),
        patch("app.core.rag.evidence_retrieval.expand_same_document_neighbors", return_value=[]),
    ):
        evidence = retrieve_planned_evidence(
            "workspace-1", [DOCUMENT_ID], "Kiến trúc mono là gì?", plan,
            STRATEGY, [source()],
        )

    assert calls == [
        "Kiến trúc mono là gì?", "monolithic architecture", "Kiến trúc mono là gì?"
    ]
    assert evidence.coverage.is_complete
    assert [item.chunk_id for item in evidence.direct_candidates] == ["real-chunk-101"]


def test_should_expand_only_current_adjacent_chunks_from_authorized_document() -> None:
    seed = candidate(chunk_index=2, chunking_version="2.0")
    valid_text = "Đoạn liền kề cùng tài liệu."
    client = MagicMock()
    collection = client.get_collection.return_value
    collection.get.return_value = {
        "ids": ["adjacent", "other-document", "stale-version"],
        "documents": [valid_text, valid_text, valid_text],
        "metadatas": [
            _neighbor_metadata(valid_text, chunk_index=1),
            _neighbor_metadata(valid_text, chunk_index=1, document_id="other"),
            _neighbor_metadata(valid_text, chunk_index=1, ingestion_version=3),
        ],
    }

    with (
        patch("app.core.rag.context_expansion.get_chroma_client", return_value=client),
        patch(
            "app.core.rag.context_expansion.get_active_collection_name",
            return_value="unichat_chunks_v2",
        ),
    ):
        neighbors = expand_same_document_neighbors(
            "workspace-1", [DOCUMENT_ID], [seed], [source()], max_candidates=2
        )

    assert [item.chunk_id for item in neighbors] == ["adjacent"]
    where = collection.get.call_args.kwargs["where"]["$and"]
    assert {"document_id": {"$eq": DOCUMENT_ID}} in where
    assert {"workspace_id": {"$eq": "workspace-1"}} in where
    assert {"chunk_index": {"$in": [1, 3]}} in where


def test_should_not_expand_stale_or_non_v2_candidates() -> None:
    seed = candidate(chunk_index=2, chunking_version=None)

    with patch("app.core.rag.context_expansion.get_chroma_client") as client:
        result = expand_same_document_neighbors(
            "workspace-1", [DOCUMENT_ID], [seed], [source()], max_candidates=2
        )

    assert result == []
    client.assert_not_called()


def test_should_expand_a_non_adjacent_chunk_from_the_same_section() -> None:
    seed = candidate(
        chunk_index=2, chunking_version="2.0", section_heading="Kiến trúc"
    )
    client = MagicMock()
    collection = client.get_collection.return_value
    collection.get.side_effect = [
        {"ids": [], "documents": [], "metadatas": []},
        {
            "ids": ["same-section"],
            "documents": ["Định nghĩa tổng quát của kiến trúc monolithic."],
            "metadatas": [
                {
                    **_neighbor_metadata("section", chunk_index=9),
                    "section_heading": "Kiến trúc",
                }
            ],
        },
    ]

    with patch("app.core.rag.context_expansion.get_chroma_client", return_value=client):
        result = expand_same_document_neighbors(
            "workspace-1", [DOCUMENT_ID], [seed], [source()], max_candidates=2
        )

    assert [item.chunk_id for item in result] == ["same-section"]
    assert collection.get.call_count == 2
    assert collection.get.call_args_list[1].kwargs["where"]["$and"][-1] == {
        "section_heading": {"$eq": "Kiến trúc"}
    }


def test_should_report_uncovered_facets_and_keep_them_out_of_supported_claims() -> None:
    plan = QuestionPlan(
        facets=[
            AnswerFacet(facet_id="supported", query="RAG là gì?", query_variants=[]),
            AnswerFacet(facet_id="missing", query="RAG hoạt động vì sao?", query_variants=[]),
        ]
    )
    evidence = RetrievedEvidence(
        [candidate()],
        [candidate()],
        EvidenceCoverage(("supported",), ("missing",)),
    )
    planning = QuestionPlanningResult(plan, "PLANNED")

    with (
        patch("app.core.rag.answer_pipeline.plan_question", return_value=planning),
        patch("app.core.rag.answer_pipeline.retrieve_planned_evidence", return_value=evidence),
        patch(
            "app.core.rag.answer_pipeline.evaluate_evidence",
            return_value=EvidenceGateResult(DecisionEnum.ANSWER, 0.9),
        ),
        patch(
            "app.core.rag.answer_pipeline.generate_rag_answer",
            return_value={
                "validationFailed": False,
                "answer": "RAG dựa trên tài liệu [1].",
                "provider": "test",
                "sections": [],
                "citations": [],
            },
        ) as generator,
    ):
        prepared = prepare_answer(RetrievalAnswerRequest.model_validate(payload()))
        response = complete_answer(prepared)

    assert response.planStatus == "PLANNED"
    assert response.uncoveredFacets == ["missing"]
    assert "một số khía cạnh" in (response.warningMessage or "")
    assert generator.call_args.kwargs["uncovered_facets"] == ["RAG hoạt động vì sao?"]


def _neighbor_metadata(
    text: str,
    *,
    chunk_index: int,
    document_id: str = DOCUMENT_ID,
    ingestion_version: int = 2,
) -> dict[str, object]:
    return {
        "workspace_id": "workspace-1",
        "document_id": document_id,
        "document_status": "PROCESSED",
        "ingestion_version": ingestion_version,
        "document_content_hash": DOCUMENT_HASH,
        "chunk_index": chunk_index,
        "chunking_version": "2.0",
        "content_hash": hashlib.sha256(text.encode("utf-8")).hexdigest(),
        "locator_type": "PDF_PAGE",
        "locator_value": f"page:{chunk_index + 1}",
    }



def test_should_diversify_fused_candidates_across_documents() -> None:
    ranked = [
        candidate(chunk_id="intro-1", document_id="doc-intro", text="Intro slide one."),
        candidate(chunk_id="intro-2", document_id="doc-intro", text="Intro slide two."),
        candidate(chunk_id="intro-3", document_id="doc-intro", text="Intro slide three."),
        candidate(chunk_id="layered-1", document_id="doc-layered", text="Layered architecture."),
        candidate(chunk_id="micro-1", document_id="doc-micro", text="Microservices topology."),
    ]

    results = fuse_candidate_lists([ranked], limit=3)

    assert [item.chunk_id for item in results] == ["intro-1", "layered-1", "micro-1"]
