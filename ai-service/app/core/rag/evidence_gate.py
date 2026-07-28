from enum import StrEnum

from app.core.rag.intent_detector import IntentEnum
from app.core.rag.retrieval_engine import RetrievedChunkCandidate
from app.core.rag.strategy_selector import RetrievalStrategy


class DecisionEnum(StrEnum):
    ANSWER = "ANSWER"
    CLARIFY = "CLARIFY"
    REFUSE = "REFUSE"


class EvidenceGateResult:
    def __init__(
        self,
        decision: DecisionEnum,
        evidence_score: float,
        refusal_reason: str | None = None,
    ) -> None:
        self.decision = decision
        self.evidence_score = evidence_score
        self.refusal_reason = refusal_reason


def evaluate_evidence(
    intent: IntentEnum,
    strategy: RetrievalStrategy,
    candidates: list[RetrievedChunkCandidate],
) -> EvidenceGateResult:
    if intent == IntentEnum.OUT_OF_SCOPE:
        return EvidenceGateResult(
            DecisionEnum.REFUSE, 0.0, "Câu hỏi nằm ngoài phạm vi hỗ trợ của hệ thống."
        )

    if not candidates:
        return EvidenceGateResult(
            DecisionEnum.REFUSE,
            0.0,
            "Tài liệu hiện có chưa đủ bằng chứng để trả lời câu hỏi này.",
        )

    unique_doc_ids = set(c.document_id for c in candidates if c.document_id)
    num_source_groups = len(unique_doc_ids)

    if num_source_groups < strategy.min_source_groups:
        reason = (
            "Thiếu nguồn thông tin đối sánh (yêu cầu tối thiểu "
            f"{strategy.min_source_groups} nguồn tài liệu)."
        )
        return EvidenceGateResult(DecisionEnum.REFUSE, 0.0, reason)

    top_sim = candidates[0].similarity if candidates else 0.0
    top3_sims = [c.similarity for c in candidates[:3]]
    mean_top3_sim = sum(top3_sims) / len(top3_sims) if top3_sims else 0.0

    coverage_score = min(1.0, num_source_groups / max(1, strategy.min_source_groups))

    evidence_score = 0.50 * top_sim + 0.30 * mean_top3_sim + 0.20 * coverage_score

    if evidence_score < strategy.evidence_gate_threshold:
        return EvidenceGateResult(
            DecisionEnum.REFUSE,
            evidence_score,
            "Độ tin cậy của tài liệu không đạt ngưỡng yêu cầu để đưa ra câu trả lời chính xác.",
        )

    return EvidenceGateResult(DecisionEnum.ANSWER, evidence_score, None)
