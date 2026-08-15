
from typing import Any
import time
import uuid
from fastapi import APIRouter, Depends
from pydantic import BaseModel, Field

from app.core.rag.evidence_gate import DecisionEnum, evaluate_evidence
from app.core.rag.intent_detector import IntentEnum, detect_intent
from app.core.rag.llm_provider import generate_rag_answer
from app.core.rag.retrieval_engine import retrieve_chunks
from app.core.rag.retrieval_trace import RetrievalTrace, record_trace
from app.core.rag.strategy_selector import get_strategy
from app.core.security import verify_service_jwt

router = APIRouter()


class RetrievalAnswerRequest(BaseModel):
    workspaceId: str = Field(..., description="Target Workspace UUID")
    allowedDocumentIds: list[str] = Field(..., description="Authorized document UUID list")
    question: str = Field(..., min_length=3, max_length=2000, description="User question")
    strategyVersion: str | None = Field("v1.0", description="RAG strategy version")
    requestId: str | None = Field(None, description="Correlation request ID")


class CitationItem(BaseModel):
    citationId: str
    documentId: str
    locator: str
    excerpt: str
    score: float


class RetrievalAnswerResponse(BaseModel):
    decision: str
    intent: str
    strategyVersion: str
    configHash: str | None = None
    evidenceScore: float
    answer: str | None = None
    citations: list[CitationItem] = []
    refusalCode: str | None = None
    refusalReason: str | None = None
    requestId: str | None = None


@router.post("/retrieval/answers", response_model=RetrievalAnswerResponse)
def get_retrieval_answer(
    request: RetrievalAnswerRequest,
    _auth: dict[str, Any] = Depends(verify_service_jwt),
) -> RetrievalAnswerResponse:
    start_time = time.perf_counter()
    req_id = request.requestId or str(uuid.uuid4())

    if not request.allowedDocumentIds:
        trace = RetrievalTrace(
            request_id=req_id,
            workspace_id=request.workspaceId,
            intent="OUT_OF_SCOPE",
            rule_id="NO_ALLOWED_DOCUMENTS",
            confidence=1.0,
            strategy_version=request.strategyVersion or "v1.0",
            config_hash="",
            allowed_document_count=0,
            decision=DecisionEnum.REFUSE.value,
            refusal_code="NO_ALLOWED_DOCUMENTS",
        )
        record_trace(trace)
        return RetrievalAnswerResponse(
            decision=DecisionEnum.REFUSE.value,
            intent="OUT_OF_SCOPE",
            strategyVersion=request.strategyVersion or "v1.0",
            evidenceScore=0.0,
            refusalCode="NO_ALLOWED_DOCUMENTS",
            refusalReason="Người dùng không có tài liệu được phép truy cập trong Workspace này.",
            requestId=req_id,
        )

    # 1. Intent detection
    intent_res = detect_intent(request.question)

    # 1b. Check for CLARIFY intent
    if intent_res.intent == IntentEnum.CLARIFY:
        trace = RetrievalTrace(
            request_id=req_id,
            workspace_id=request.workspaceId,
            intent=intent_res.intent.value,
            rule_id=intent_res.rule_id,
            confidence=intent_res.confidence,
            strategy_version=request.strategyVersion or "v1.0",
            config_hash=intent_res.config_hash,
            allowed_document_count=len(request.allowedDocumentIds),
            decision=DecisionEnum.CLARIFY.value,
            refusal_code="CLARIFY_REQUIRED",
            latency_ms=(time.perf_counter() - start_time) * 1000,
        )
        record_trace(trace)
        return RetrievalAnswerResponse(
            decision=DecisionEnum.CLARIFY.value,
            intent=intent_res.intent.value,
            strategyVersion=request.strategyVersion or "v1.0",
            configHash=intent_res.config_hash,
            evidenceScore=0.0,
            refusalCode="CLARIFY_REQUIRED",
            refusalReason="Câu hỏi chưa rõ ràng hoặc thiếu ngữ cảnh cụ thể. Vui lòng bổ sung rõ đối tượng cần hỏi.",
            requestId=req_id,
        )

    # 2. Strategy mapping
    strategy = get_strategy(intent_res.intent)

    # 3. Vector retrieval
    candidates = retrieve_chunks(
        workspace_id=request.workspaceId,
        allowed_document_ids=request.allowedDocumentIds,
        question=request.question,
        strategy=strategy,
    )

    # 4. Evidence Gate evaluation
    gate_res = evaluate_evidence(intent_res.intent, strategy, candidates)

    if gate_res.decision != DecisionEnum.ANSWER:
        trace = RetrievalTrace(
            request_id=req_id,
            workspace_id=request.workspaceId,
            intent=intent_res.intent.value,
            rule_id=intent_res.rule_id,
            confidence=intent_res.confidence,
            strategy_version=request.strategyVersion or "v1.0",
            config_hash=intent_res.config_hash,
            allowed_document_count=len(request.allowedDocumentIds),
            retrieved_chunk_ids=[c.chunk_id for c in candidates],
            evidence_score=gate_res.evidence_score,
            decision=gate_res.decision.value,
            refusal_code="EVIDENCE_INSUFFICIENT",
            latency_ms=(time.perf_counter() - start_time) * 1000,
        )
        record_trace(trace)
        return RetrievalAnswerResponse(
            decision=gate_res.decision.value,
            intent=intent_res.intent.value,
            strategyVersion=request.strategyVersion or "v1.0",
            configHash=intent_res.config_hash,
            evidenceScore=gate_res.evidence_score,
            refusalCode="EVIDENCE_INSUFFICIENT",
            refusalReason=gate_res.refusal_reason,
            requestId=req_id,
        )

    # 5. LLM Answer generation
    rag_res = generate_rag_answer(
        request.question,
        candidates,
        allowed_document_ids=request.allowedDocumentIds,
    )

    if rag_res.get("validationFailed"):
        trace = RetrievalTrace(
            request_id=req_id,
            workspace_id=request.workspaceId,
            intent=intent_res.intent.value,
            rule_id=intent_res.rule_id,
            confidence=intent_res.confidence,
            strategy_version=request.strategyVersion or "v1.0",
            config_hash=intent_res.config_hash,
            allowed_document_count=len(request.allowedDocumentIds),
            retrieved_chunk_ids=[c.chunk_id for c in candidates],
            evidence_score=gate_res.evidence_score,
            decision=DecisionEnum.REFUSE.value,
            refusal_code="CITATION_VALIDATION_FAILED",
            provider=rag_res.get("provider", "none"),
            latency_ms=(time.perf_counter() - start_time) * 1000,
        )
        record_trace(trace)
        return RetrievalAnswerResponse(
            decision=DecisionEnum.REFUSE.value,
            intent=intent_res.intent.value,
            strategyVersion=request.strategyVersion or "v1.0",
            configHash=intent_res.config_hash,
            evidenceScore=gate_res.evidence_score,
            refusalCode="CITATION_VALIDATION_FAILED",
            refusalReason="Trích dẫn không hợp lệ hoặc nằm ngoài phạm vi tài liệu được cấp quyền.",
            requestId=req_id,
        )

    citations = [
        CitationItem(
            citationId=c["citationId"],
            documentId=c["documentId"],
            locator=c["locator"],
            excerpt=c["excerpt"],
            score=c["score"],
        )
        for c in rag_res.get("citations", [])
    ]

    trace = RetrievalTrace(
        request_id=req_id,
        workspace_id=request.workspaceId,
        intent=intent_res.intent.value,
        rule_id=intent_res.rule_id,
        confidence=intent_res.confidence,
        strategy_version=request.strategyVersion or "v1.0",
        config_hash=intent_res.config_hash,
        allowed_document_count=len(request.allowedDocumentIds),
        retrieved_chunk_ids=[c.chunk_id for c in candidates],
        evidence_score=gate_res.evidence_score,
        decision=DecisionEnum.ANSWER.value,
        provider=rag_res.get("provider", "unknown"),
        latency_ms=(time.perf_counter() - start_time) * 1000,
    )
    record_trace(trace)

    return RetrievalAnswerResponse(
        decision=DecisionEnum.ANSWER.value,
        intent=intent_res.intent.value,
        strategyVersion=request.strategyVersion or "v1.0",
        configHash=intent_res.config_hash,
        evidenceScore=gate_res.evidence_score,
        answer=rag_res.get("answer"),
        citations=citations,
        requestId=req_id,
    )

