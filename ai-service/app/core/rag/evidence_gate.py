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
        single_source_warning: bool = False,
        warning_message: str | None = None,
    ) -> None:
        self.decision = decision
        self.evidence_score = evidence_score
        self.refusal_reason = refusal_reason
        self.single_source_warning = single_source_warning
        self.warning_message = warning_message


def evaluate_evidence(
    intent: IntentEnum,
    strategy: RetrievalStrategy,
    candidates: list[RetrievedChunkCandidate],
    workspace_document_count: int | None = None,
) -> EvidenceGateResult:
    """Evaluate authorized, direct evidence and decide ANSWER or REFUSE."""
    if intent == IntentEnum.OUT_OF_SCOPE:
        return EvidenceGateResult(
            DecisionEnum.REFUSE, 0.0, "Câu hỏi nằm ngoài phạm vi hỗ trợ của hệ thống."
        )
    direct_candidates = select_evidence_candidates(intent, candidates)
    refusal = _candidate_refusal(intent, bool(candidates), direct_candidates)
    if refusal:
        return refusal
    source_groups = len({item.document_id for item in direct_candidates if item.document_id})
    minimum_groups = _effective_minimum_groups(strategy, workspace_document_count)
    source_refusal = _source_group_refusal(source_groups, minimum_groups)
    if source_refusal:
        return source_refusal
    evidence_score = _calculate_evidence_score(
        direct_candidates, source_groups, minimum_groups
    )
    return _score_decision(intent, strategy, source_groups, evidence_score)


def _candidate_refusal(
    intent: IntentEnum,
    had_candidates: bool,
    candidates: list[RetrievedChunkCandidate],
) -> EvidenceGateResult | None:
    if candidates:
        return None
    if had_candidates and intent == IntentEnum.DEFINITION:
        reason = "Chỉ tìm thấy tiêu đề hoặc tên khái niệm; chưa tìm thấy đoạn định nghĩa trực tiếp."
    else:
        reason = "Tài liệu hiện có chưa đủ bằng chứng để trả lời câu hỏi này."
    return EvidenceGateResult(DecisionEnum.REFUSE, 0.0, reason)


def _effective_minimum_groups(
    strategy: RetrievalStrategy, workspace_document_count: int | None
) -> int:
    if workspace_document_count is None:
        return strategy.min_source_groups
    return min(strategy.min_source_groups, max(1, workspace_document_count))


def _source_group_refusal(
    source_groups: int, minimum_groups: int
) -> EvidenceGateResult | None:
    if source_groups >= minimum_groups:
        return None
    reason = (
        "Thiếu nguồn thông tin đối sánh "
        f"(yêu cầu tối thiểu {minimum_groups} nguồn tài liệu)."
    )
    return EvidenceGateResult(DecisionEnum.REFUSE, 0.0, reason)


def _calculate_evidence_score(
    candidates: list[RetrievedChunkCandidate], source_groups: int, minimum_groups: int
) -> float:
    similarities = [candidate.similarity for candidate in candidates[:3]]
    mean_similarity = sum(similarities) / len(similarities)
    coverage_score = min(1.0, source_groups / max(1, minimum_groups))
    return 0.50 * similarities[0] + 0.30 * mean_similarity + 0.20 * coverage_score


def _source_warning(intent: IntentEnum, source_groups: int) -> tuple[bool, str | None]:
    multi_perspective = intent in (
        IntentEnum.COMPARISON,
        IntentEnum.SUMMARY,
        IntentEnum.REASONING,
    )
    if source_groups != 1 or not multi_perspective:
        return False, None
    message = (
        "Nội dung được tổng hợp từ 1 nguồn tài liệu duy nhất. "
        "Khuyến nghị kiểm chứng lại với các tài liệu đối sánh khác."
    )
    return True, message


def _score_decision(
    intent: IntentEnum,
    strategy: RetrievalStrategy,
    source_groups: int,
    evidence_score: float,
) -> EvidenceGateResult:
    if evidence_score < strategy.evidence_gate_threshold:
        reason = "Độ tin cậy của tài liệu không đạt ngưỡng yêu cầu để đưa ra câu trả lời chính xác."
        return EvidenceGateResult(DecisionEnum.REFUSE, evidence_score, reason)
    has_warning, warning = _source_warning(intent, source_groups)
    return EvidenceGateResult(
        DecisionEnum.ANSWER,
        evidence_score,
        single_source_warning=has_warning,
        warning_message=warning,
    )


def select_evidence_candidates(
    intent: IntentEnum, candidates: list[RetrievedChunkCandidate]
) -> list[RetrievedChunkCandidate]:
    """Return candidates that can provide direct evidence for the detected intent."""
    if intent != IntentEnum.DEFINITION:
        return candidates
    return [candidate for candidate in candidates if not _is_title_only(candidate)]


def _is_title_only(candidate: RetrievedChunkCandidate) -> bool:
    text = candidate.text.strip()
    if not text:
        return True
    heading = (candidate.section_heading or "").strip()
    if heading and " ".join(text.split()) != " ".join(heading.split()):
        return False
    lines = [line.strip() for line in text.splitlines() if line.strip()]
    has_sentence_ending = any(mark in text for mark in (".", "?", "!", ";"))
    return len(lines) <= 2 and len(text.split()) <= 12 and not has_sentence_ending
