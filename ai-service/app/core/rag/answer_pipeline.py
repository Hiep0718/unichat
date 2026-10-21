"""One evidence and provenance pipeline for both private response transports."""

import logging
import time
from dataclasses import dataclass

from app.core.rag.context_policy import safe_context
from app.core.rag.contracts import (
    AnswerSection,
    CitationItem,
    RetrievalAnswerRequest,
    RetrievalAnswerResponse,
)
from app.core.rag.evidence_gate import DecisionEnum, evaluate_evidence
from app.core.rag.generation_policy import GenerationPolicy
from app.core.rag.intent_detector import IntentEnum, detect_intent
from app.core.rag.llm_provider import generate_rag_answer
from app.core.rag.provider_contracts import Cancellation, check_cancelled
from app.core.rag.provider_gateway import Observer
from app.core.rag.retrieval_engine import RetrievedChunkCandidate, retrieve_chunks
from app.core.rag.strategy_selector import get_strategy

logger = logging.getLogger(__name__)


@dataclass
class PreparedAnswer:
    """Validated request and metadata; a refusal has no candidates and no model call."""

    request: RetrievalAnswerRequest
    response: RetrievalAnswerResponse
    candidates: list[RetrievedChunkCandidate]


def prepare_answer(
    request: RetrievalAnswerRequest, cancelled: Cancellation | None = None
) -> PreparedAnswer:
    """Enforce explicit cloud policy before local retrieval or generator invocation."""
    check_cancelled(cancelled)
    response = RetrievalAnswerResponse(
        decision="REFUSE",
        intent="OUT_OF_SCOPE",
        strategyVersion=request.strategyVersion,
        requestId=request.requestId,
        operationId=str(request.operationId) if request.operationId else None,
        knowledgeMode="EXPANDED" if request.allowExternalKnowledge else "STRICT",
    )
    prepared = PreparedAnswer(request, response, [])
    if request.cloudAllowed is False:
        return refuse(prepared, "CLOUD_POLICY_DENIED", "Workspace không cho phép xử lý bằng AI.")
    if (
        request.cloudAllowed is not True
        or request.operationId is None
        or request.permissionVersion is None
    ):
        return refuse(prepared, "OPERATION_POLICY_REQUIRED", "Chưa có chính sách xử lý AI hợp lệ.")
    if not request.allowedDocumentIds:
        return refuse(prepared, "NO_ALLOWED_DOCUMENTS", "Không có tài liệu được phép truy cập.")
    allowed = set(request.allowedDocumentIds)
    if {source.documentId for source in request.sources} != allowed:
        return refuse(prepared, "SOURCE_METADATA_INVALID", "Metadata nguồn hiện hành chưa đầy đủ.")
    check_cancelled(cancelled)
    prepared = _retrieve(prepared, cancelled)
    check_cancelled(cancelled)
    return prepared


def _retrieve(prepared: PreparedAnswer, cancelled: Cancellation | None) -> PreparedAnswer:
    request, response = prepared.request, prepared.response
    history, summary, _ = safe_context(
        request.conversationHistory,
        request.conversationSummary,
        request.summarySources,
        request.sources,
    )
    detected = detect_intent(request.question, has_conversation_context=bool(history or summary))
    response.intent = detected.intent.value
    response.configHash = detected.config_hash
    if detected.intent == IntentEnum.CLARIFY:
        response.decision = "CLARIFY"
        return refuse(
            prepared, "CLARIFY_REQUIRED", "Vui lòng bổ sung rõ đối tượng cần hỏi.", "CLARIFY"
        )
    strategy = get_strategy(detected.intent)
    check_cancelled(cancelled)
    prepared.candidates = retrieve_chunks(
        str(request.workspaceId),
        [str(value) for value in request.allowedDocumentIds],
        request.question,
        strategy,
    )
    check_cancelled(cancelled)
    gate = evaluate_evidence(
        detected.intent,
        strategy,
        prepared.candidates,
        workspace_document_count=len(request.allowedDocumentIds),
    )
    response.evidenceScore = gate.evidence_score
    response.singleSourceWarning = gate.single_source_warning
    response.warningMessage = gate.warning_message
    if gate.decision != DecisionEnum.ANSWER:
        return refuse(
            prepared,
            "EVIDENCE_INSUFFICIENT",
            gate.refusal_reason or "Chưa đủ bằng chứng.",
            gate.decision.value,
        )
    response.decision = "ANSWER"
    return prepared


def refuse(
    prepared: PreparedAnswer, code: str, reason: str, decision: str = "REFUSE"
) -> PreparedAnswer:
    """Return an explicit, content-free evidence/policy outcome."""
    prepared.response.decision = decision
    prepared.response.refusalCode = code
    prepared.response.refusalReason = reason
    prepared.candidates = []
    return prepared


def complete_answer(
    prepared: PreparedAnswer,
    observer: Observer | None = None,
    cancelled: Cancellation | None = None,
) -> RetrievalAnswerResponse:
    """Validate full generator output; this private result never implies a public DB commit."""
    check_cancelled(cancelled)
    if prepared.response.decision != "ANSWER":
        return prepared.response
    request = prepared.request
    history, summary, dependencies = safe_context(
        request.conversationHistory,
        request.conversationSummary,
        request.summarySources,
        request.sources,
    )
    policy = GenerationPolicy(request.requestId, str(request.operationId), True, time.time() + 120)
    result = generate_rag_answer(
        request.question,
        prepared.candidates,
        allowed_document_ids=[str(value) for value in request.allowedDocumentIds],
        allow_external_knowledge=request.allowExternalKnowledge,
        conversation_history=history,
        conversation_summary=summary,
        single_source_warning=prepared.response.singleSourceWarning,
        policy=policy,
        sources=request.sources,
        observer=observer,
        cancelled=cancelled,
    )
    if result.get("validationFailed"):
        code = str(result.get("refusalCode", "CITATION_VALIDATION_FAILED"))
        return refuse(prepared, code, "Không thể tạo câu trả lời đã kiểm tra an toàn.").response
    prepared.response.answer = result["answer"]
    prepared.response.provider = result.get("provider")
    prepared.response.sections = [
        AnswerSection.model_validate(value) for value in result["sections"]
    ]
    prepared.response.citations = [
        CitationItem.model_validate(value) for value in result["citations"]
    ]
    prepared.response.compactedSummary = result.get("compactedSummary")
    prepared.response.summarySources = dependencies if prepared.response.compactedSummary else []
    return prepared.response
