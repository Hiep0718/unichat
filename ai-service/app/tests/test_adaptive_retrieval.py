from app.core.rag.evidence_gate import DecisionEnum, evaluate_evidence
from app.core.rag.intent_detector import IntentEnum, detect_intent
from app.core.rag.retrieval_engine import RetrievedChunkCandidate
from app.core.rag.strategy_selector import get_strategy


def test_intent_detection_rules() -> None:
    res_comp = detect_intent("So sánh giữa lập trình Java và Python trong dự án")
    assert res_comp.intent == IntentEnum.COMPARISON

    res_sum = detect_intent("Tóm tắt ý chính của chương 3 về cơ sở dữ liệu")
    assert res_sum.intent == IntentEnum.SUMMARY

    res_def = detect_intent("Thế nào là khái niệm Vector Embedding?")
    assert res_def.intent == IntentEnum.DEFINITION

    res_reason = detect_intent("Tại sao hệ thống RAG cần kiểm soát bằng chứng Evidence Gate?")
    assert res_reason.intent == IntentEnum.REASONING

    res_fact = detect_intent("Ai là tác giả của khóa luận UniChat?")
    assert res_fact.intent == IntentEnum.FACT

def test_evidence_gate_refusal_on_empty() -> None:
    strategy = get_strategy(IntentEnum.FACT)
    gate_res = evaluate_evidence(IntentEnum.FACT, strategy, [])
    assert gate_res.decision == DecisionEnum.REFUSE
    assert "chưa đủ bằng chứng" in (gate_res.refusal_reason or "")

def test_evidence_gate_answer_on_high_similarity() -> None:
    strategy = get_strategy(IntentEnum.FACT)
    candidates = [
        RetrievedChunkCandidate("chunk1", "doc1", "Nội dung 1", 0.85, "PDF_PAGE", "page:1", "hash1")
    ]
    gate_res = evaluate_evidence(IntentEnum.FACT, strategy, candidates)
    assert gate_res.decision == DecisionEnum.ANSWER
    assert gate_res.evidence_score >= strategy.evidence_gate_threshold


def test_evidence_gate_refuses_title_only_definition_despite_high_similarity() -> None:
    strategy = get_strategy(IntentEnum.DEFINITION)
    candidates = [
        RetrievedChunkCandidate(
            "title-chunk",
            "doc1",
            "Architecture Characteristics Defined",
            0.95,
            "SLIDE_NUMBER",
            "slide:4",
            "hash1",
            section_heading="Architecture Characteristics Defined",
        )
    ]

    gate_res = evaluate_evidence(IntentEnum.DEFINITION, strategy, candidates)

    assert gate_res.decision == DecisionEnum.REFUSE
    assert gate_res.evidence_score == 0.0
    assert "chưa tìm thấy đoạn định nghĩa trực tiếp" in (gate_res.refusal_reason or "")


def test_evidence_gate_comparison_adaptive_single_doc_workspace() -> None:
    """COMPARISON with single document workspace should not refuse if workspace_document_count=1."""
    strategy = get_strategy(IntentEnum.COMPARISON)
    candidates = [
        RetrievedChunkCandidate("c1", "doc1", "Info A", 0.90, "PDF_PAGE", "page:1", "h1"),
        RetrievedChunkCandidate("c2", "doc1", "Info B", 0.88, "PDF_PAGE", "page:2", "h2"),
    ]
    gate_res = evaluate_evidence(
        IntentEnum.COMPARISON,
        strategy,
        candidates,
        workspace_document_count=1,
    )
    assert gate_res.decision == DecisionEnum.ANSWER


def test_should_classify_corpus_overview_as_summary_and_keep_concept_as_definition() -> None:
    overview_queries = [
        "Các kiến trúc đề cập trong tài liệu là gì",
        "Những mô hình nào được trình bày trong bài giảng?",
        "Trong tài liệu có những kiến trúc nào?",
        "Liệt kê các phong cách kiến trúc phần mềm",
    ]
    for query in overview_queries:
        assert detect_intent(query).intent == IntentEnum.SUMMARY

    assert detect_intent("microservice là gì").intent == IntentEnum.DEFINITION
    assert detect_intent("Trong tài liệu này, microservice là gì?").intent == IntentEnum.DEFINITION


def test_should_include_source_filename_and_section_heading_in_generation_prompt() -> None:
    from unittest.mock import patch

    from app.core.rag.llm_provider import generate_rag_answer
    from app.core.rag.provider_gateway import ProviderResult
    from app.tests.plan_v2_fixtures import DOCUMENT_ID, candidate, generated, policy, source

    chunk = candidate(locator_value="slide:12", section_heading="Microservices Topology")
    doc_source = source(fileName="07._Microservices.pdf")
    provider_reply = ProviderResult(generated(), "gemini", "gemini-3.5-flash", "primary")

    with patch("app.core.rag.llm_provider.generate", return_value=provider_reply) as mock_gen:
        result = generate_rag_answer(
            "Các kiến trúc đề cập trong tài liệu là gì?",
            [chunk],
            [DOCUMENT_ID],
            policy=policy(),
            sources=[doc_source],
        )

    prompt = mock_gen.call_args.args[0]
    assert result["validationFailed"] is False
    assert "[1] Nguồn: 07._Microservices.pdf (slide:12) | Mục: Microservices Topology:\n" in prompt

