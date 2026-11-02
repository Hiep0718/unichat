"""One evidence and provenance pipeline for both private response transports."""

import logging
import time
from dataclasses import dataclass
from typing import Any

from app.core.rag.context_policy import safe_context
from app.core.rag.contextual_query import build_contextual_query
from app.core.rag.contracts import (
    AnswerSection,
    CitationItem,
    RetrievalAnswerRequest,
    RetrievalAnswerResponse,
    SourceDependency,
)
from app.core.rag.evidence_gate import (
    DecisionEnum,
    EvidenceGateResult,
    evaluate_evidence,
    select_evidence_candidates,
)
from app.core.rag.evidence_retrieval import RetrievedEvidence, retrieve_planned_evidence
from app.core.rag.generation_policy import GenerationPolicy
from app.core.rag.intent_detector import IntentEnum, IntentResult, detect_intent
from app.core.rag.llm_provider import generate_rag_answer
from app.core.rag.provider_contracts import Cancellation, check_cancelled
from app.core.rag.provider_gateway import Observer
from app.core.rag.question_planner import QuestionPlanningResult, plan_question
from app.core.rag.retrieval_engine import RetrievedChunkCandidate
from app.core.rag.strategy_selector import RetrievalStrategy, get_strategy

logger = logging.getLogger(__name__)


@dataclass
class PreparedAnswer:
    """Validated request and metadata; a refusal has no candidates and no model call."""

    request: RetrievalAnswerRequest
    response: RetrievalAnswerResponse
    candidates: list[RetrievedChunkCandidate]
    uncovered_facet_queries: list[str]


def prepare_answer(
    request: RetrievalAnswerRequest, cancelled: Cancellation | None = None
) -> PreparedAnswer:
    """Enforce explicit cloud policy before local retrieval or generator invocation."""
    check_cancelled(cancelled)
    prepared = _new_prepared_answer(request)
    policy_refusal = _policy_refusal(prepared)
    if policy_refusal is not None:
        return policy_refusal
    check_cancelled(cancelled)
    prepared = _retrieve(prepared, cancelled)
    check_cancelled(cancelled)
    return prepared


def _new_prepared_answer(request: RetrievalAnswerRequest) -> PreparedAnswer:
    response = RetrievalAnswerResponse(
        decision="REFUSE",
        intent="OUT_OF_SCOPE",
        strategyVersion=request.strategyVersion,
        requestId=request.requestId,
        operationId=str(request.operationId) if request.operationId else None,
        knowledgeMode="EXPANDED" if request.allowExternalKnowledge else "STRICT",
    )
    return PreparedAnswer(request, response, [], [])


def _policy_refusal(prepared: PreparedAnswer) -> PreparedAnswer | None:
    request = prepared.request
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
    return None


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
    strategy = get_strategy(detected.intent)
    intent_refusal = _intent_refusal(prepared, detected, strategy)
    if intent_refusal is not None:
        return intent_refusal
    contextual_query = build_contextual_query(request.question, history, summary)
    planning, evidence = _planned_evidence(
        request, detected, strategy, contextual_query, cancelled
    )
    _apply_retrieval_metadata(prepared, planning, evidence)
    return _gate_retrieved_evidence(prepared, detected, strategy, evidence)


def _intent_refusal(
    prepared: PreparedAnswer, detected: IntentResult, strategy: RetrievalStrategy
) -> PreparedAnswer | None:
    if detected.intent == IntentEnum.CLARIFY:
        prepared.response.decision = "CLARIFY"
        return refuse(
            prepared, "CLARIFY_REQUIRED", "Vui lòng bổ sung rõ đối tượng cần hỏi.", "CLARIFY"
        )
    if strategy.top_k == 0:
        return refuse(
            prepared, "OUT_OF_SCOPE", "Câu hỏi nằm ngoài phạm vi hỗ trợ của hệ thống."
        )
    return None


def _planned_evidence(
    request: RetrievalAnswerRequest,
    detected: IntentResult,
    strategy: RetrievalStrategy,
    contextual_query: str | None,
    cancelled: Cancellation | None,
) -> tuple[QuestionPlanningResult, RetrievedEvidence]:
    plan_policy = GenerationPolicy(
        request.requestId, str(request.operationId), True, time.time() + 240
    )
    planning = plan_question(request.question, detected.intent, plan_policy, cancelled)
    check_cancelled(cancelled)
    evidence = retrieve_planned_evidence(
        str(request.workspaceId),
        [str(value) for value in request.allowedDocumentIds],
        request.question,
        planning.plan,
        strategy,
        request.sources,
        contextual_query,
        cancelled,
    )
    check_cancelled(cancelled)
    return planning, evidence


def _apply_retrieval_metadata(
    prepared: PreparedAnswer,
    planning: QuestionPlanningResult,
    evidence: RetrievedEvidence,
) -> None:
    request, response = prepared.request, prepared.response
    prepared.candidates = evidence.candidates
    uncovered_ids = set(evidence.coverage.uncovered_facet_ids)
    prepared.uncovered_facet_queries = [
        facet.query for facet in planning.plan.facets if facet.facet_id in uncovered_ids
    ]
    response.planStatus = planning.status
    response.uncoveredFacets = list(evidence.coverage.uncovered_facet_ids)
    logger.info(
        "retrieval_evidence_coverage",
        extra={
            "request_id": request.requestId,
            "plan_status": planning.status,
            "facet_count": len(planning.plan.facets),
            "covered_facet_count": len(evidence.coverage.covered_facet_ids),
            "uncovered_facet_count": len(prepared.uncovered_facet_queries),
            "direct_candidate_count": len(evidence.direct_candidates),
            "context_candidate_count": len(evidence.candidates),
        },
    )


def _gate_retrieved_evidence(
    prepared: PreparedAnswer,
    detected: IntentResult,
    strategy: RetrievalStrategy,
    evidence: RetrievedEvidence,
) -> PreparedAnswer:
    request, response = prepared.request, prepared.response
    gate = evaluate_evidence(
        detected.intent,
        strategy,
        evidence.direct_candidates,
        workspace_document_count=len(request.allowedDocumentIds),
    )
    response.evidenceScore = gate.evidence_score
    response.singleSourceWarning = gate.single_source_warning
    response.warningMessage = _retrieval_warning(prepared, gate)
    if gate.decision != DecisionEnum.ANSWER:
        return refuse(
            prepared,
            "EVIDENCE_INSUFFICIENT",
            gate.refusal_reason or "Chưa đủ bằng chứng.",
            gate.decision.value,
        )
    prepared.candidates = select_evidence_candidates(detected.intent, prepared.candidates)
    response.decision = "ANSWER"
    return prepared


def _retrieval_warning(
    prepared: PreparedAnswer, gate: EvidenceGateResult
) -> str | None:
    warning = gate.warning_message
    if prepared.uncovered_facet_queries:
        warning = _coverage_warning(warning)
    return warning


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
    policy = GenerationPolicy(request.requestId, str(request.operationId), True, time.time() + 240)
    result = _generate_answer(
        prepared, history, summary, policy, observer, cancelled
    )
    if result.get("validationFailed"):
        code = str(result.get("refusalCode", "CITATION_VALIDATION_FAILED"))
        return refuse(prepared, code, "Không thể tạo câu trả lời đã kiểm tra an toàn.").response
    return _apply_generation_result(prepared.response, result, dependencies)


def _generate_answer(
    prepared: PreparedAnswer,
    history: list[dict[str, str]],
    summary: str | None,
    policy: GenerationPolicy,
    observer: Observer | None,
    cancelled: Cancellation | None,
) -> dict[str, Any]:
    request = prepared.request
    return generate_rag_answer(
        request.question,
        prepared.candidates,
        allowed_document_ids=[str(value) for value in request.allowedDocumentIds],
        allow_external_knowledge=request.allowExternalKnowledge,
        conversation_history=history,
        conversation_summary=summary,
        single_source_warning=prepared.response.singleSourceWarning,
        policy=policy,
        sources=request.sources,
        uncovered_facets=prepared.uncovered_facet_queries,
        observer=observer,
        cancelled=cancelled,
    )


def _apply_generation_result(
    response: RetrievalAnswerResponse,
    result: dict[str, Any],
    dependencies: list[SourceDependency],
) -> RetrievalAnswerResponse:
    response.answer = str(result["answer"])
    response.provider = str(result["provider"]) if result.get("provider") else None
    response.sections = [
        AnswerSection.model_validate(value) for value in result["sections"]
    ]
    response.citations = [
        CitationItem.model_validate(value) for value in result["citations"]
    ]
    compacted = result.get("compactedSummary")
    response.compactedSummary = str(compacted) if compacted else None
    response.summarySources = dependencies if response.compactedSummary else []
    return response


def _coverage_warning(existing: str | None) -> str:
    """Explain incomplete facet support without exposing document/query contents."""
    partial = "Chưa tìm thấy bằng chứng tài liệu cho một số khía cạnh của câu hỏi."
    return f"{existing} {partial}".strip() if existing else partial


