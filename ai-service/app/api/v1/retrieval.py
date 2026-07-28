from typing import List, Optional
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

from app.core.rag.intent_detector import detect_intent
from app.core.rag.strategy_selector import get_strategy
from app.core.rag.retrieval_engine import retrieve_chunks
from app.core.rag.evidence_gate import evaluate_evidence, DecisionEnum
from app.core.rag.llm_provider import generate_rag_answer

router = APIRouter()

class RetrievalAnswerRequest(BaseModel):
    workspaceId: str = Field(..., description="Target Workspace UUID")
    allowedDocumentIds: List[str] = Field(..., description="Authorized document UUID list")
    question: str = Field(..., min_length=3, max_length=2000, description="User question")
    strategyVersion: Optional[str] = Field("v1.0", description="RAG strategy version")
    requestId: Optional[str] = Field(None, description="Correlation request ID")

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
    evidenceScore: float
    answer: Optional[str] = None
    citations: List[CitationItem] = []
    refusalCode: Optional[str] = None
    refusalReason: Optional[str] = None

@router.post("/retrieval/answers", response_model=RetrievalAnswerResponse)
def get_retrieval_answer(request: RetrievalAnswerRequest):
    if not request.allowedDocumentIds:
        return RetrievalAnswerResponse(
            decision=DecisionEnum.REFUSE.value,
            intent="OUT_OF_SCOPE",
            strategyVersion=request.strategyVersion or "v1.0",
            evidenceScore=0.0,
            refusalCode="NO_ALLOWED_DOCUMENTS",
            refusalReason="Người dùng không có tài liệu được phép truy cập trong Workspace này.",
        )

    # 1. Intent detection
    intent_res = detect_intent(request.question)

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
        return RetrievalAnswerResponse(
            decision=gate_res.decision.value,
            intent=intent_res.intent.value,
            strategyVersion=request.strategyVersion or "v1.0",
            evidenceScore=gate_res.evidence_score,
            refusalCode="EVIDENCE_INSUFFICIENT",
            refusalReason=gate_res.refusal_reason,
        )

    # 5. LLM Answer generation
    rag_res = generate_rag_answer(request.question, candidates)

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

    return RetrievalAnswerResponse(
        decision=DecisionEnum.ANSWER.value,
        intent=intent_res.intent.value,
        strategyVersion=request.strategyVersion or "v1.0",
        evidenceScore=gate_res.evidence_score,
        answer=rag_res.get("answer"),
        citations=citations,
    )
