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
