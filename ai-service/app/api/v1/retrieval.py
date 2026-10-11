"""Authenticated private retrieval APIs; public operation completion belongs to Core."""

import logging
from typing import Annotated, Any

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse

from app.core.rag.answer_pipeline import complete_answer, prepare_answer
from app.core.rag.contracts import (
    CitationItem,
    RetrievalAnswerRequest,
    RetrievalAnswerResponse,
)
from app.core.rag.stream_provider import generate_rag_answer_stream
from app.core.security import verify_service_jwt

router = APIRouter()
logger = logging.getLogger(__name__)
ServiceAuth = Annotated[dict[str, Any], Depends(verify_service_jwt)]
__all__ = ["CitationItem", "RetrievalAnswerRequest", "RetrievalAnswerResponse", "router"]


@router.post("/retrieval/answers", response_model=RetrievalAnswerResponse)
def get_retrieval_answer(
    request: RetrievalAnswerRequest, _auth: ServiceAuth
) -> RetrievalAnswerResponse:
    """Return ANSWER/CLARIFY/REFUSE only after evidence and complete claim validation."""
    try:
        return complete_answer(prepare_answer(request))
    except Exception as error:
        logger.error(
            "retrieval_failed request_id=%s operation_id=%s code=%s",
            request.requestId,
            request.operationId,
            type(error).__name__,
        )
        raise HTTPException(status_code=503, detail="RETRIEVAL_UNAVAILABLE") from error


@router.post("/retrieval/answers/stream")
def get_retrieval_answer_stream(
    request: RetrievalAnswerRequest, _auth: ServiceAuth
) -> StreamingResponse:
    """Emit provisional progress and one private result; never emit public final/done."""
    return StreamingResponse(
        generate_rag_answer_stream(request),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-store", "X-Accel-Buffering": "no"},
    )
