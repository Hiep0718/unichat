import time
from typing import Any

from app.core.rag.evidence_gate import evaluate_evidence
from app.core.rag.intent_detector import detect_intent
from app.core.rag.retrieval_engine import retrieve_chunks
from app.core.rag.strategy_selector import get_strategy

GOLDEN_DATASET: list[dict[str, Any]] = [
    {
        "id": "eval_001",
        "question": "Khái niệm Vector Embedding trong UniChat RAG là gì?",
        "ground_truth": "Vector Embedding là biểu diễn toán học không gian n chiều của văn bản",
        "expected_intent": "DEFINITION",
    },
    {
        "id": "eval_002",
        "question": "So sánh sự khác nhau giữa PDF và DOCX khi trích xuất tài liệu",
        "ground_truth": "PDF trích xuất theo trang, DOCX trích xuất theo đoạn và bảng",
        "expected_intent": "COMPARISON",
    },
    {
        "id": "eval_003",
        "question": "Tóm tắt ý chính của tài liệu quy chế đào tạo đại học",
        "ground_truth": "Quy chế bao gồm các quy định về tín chỉ, điểm số và điều kiện tốt nghiệp",
        "expected_intent": "SUMMARY",
    },
]

def run_evaluation_suite(workspace_id: str, allowed_document_ids: list[str]) -> dict[str, Any]:
    start_time = time.time()
    results: list[dict[str, Any]] = []

    total_samples = len(GOLDEN_DATASET)
    intent_acc_count = 0
    passed_evals = 0

    for sample in GOLDEN_DATASET:
        sample_start = time.time()
        q = sample["question"]

        intent_res = detect_intent(q)
        if intent_res.intent.value == sample["expected_intent"]:
            intent_acc_count += 1

        strategy = get_strategy(intent_res.intent)
        candidates = retrieve_chunks(workspace_id, allowed_document_ids, q, strategy)
        gate_res = evaluate_evidence(intent_res.intent, strategy, candidates)

        latency_ms = round((time.time() - sample_start) * 1000, 2)

        is_passed = gate_res.decision.value in ("ANSWER", "REFUSE")
        if is_passed:
            passed_evals += 1

        results.append({
            "eval_id": sample["id"],
            "question": q,
            "detected_intent": intent_res.intent.value,
            "expected_intent": sample["expected_intent"],
            "evidence_score": gate_res.evidence_score,
            "decision": gate_res.decision.value,
            "latency_ms": latency_ms,
            "passed": is_passed,
        })

    total_time_ms = round((time.time() - start_time) * 1000, 2)
    intent_accuracy = round(intent_acc_count / total_samples, 2)
    pass_rate = round(passed_evals / total_samples, 2)

    return {
        "suite": "unichat_p0_benchmark_v1",
        "total_samples": total_samples,
        "intent_accuracy": intent_accuracy,
        "pass_rate": pass_rate,
        "total_time_ms": total_time_ms,
        "sample_results": results,
    }
