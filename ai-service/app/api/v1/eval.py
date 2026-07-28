from typing import List, Optional
from fastapi import APIRouter
from pydantic import BaseModel, Field
from app.services.eval_runner import run_evaluation_suite

router = APIRouter()

class EvalRunRequest(BaseModel):
    workspaceId: str = Field(..., description="Workspace ID for evaluation")
    allowedDocumentIds: List[str] = Field(..., description="Document IDs to evaluate against")

@router.post("/eval/run")
def trigger_eval_suite(request: EvalRunRequest):
    return run_evaluation_suite(request.workspaceId, request.allowedDocumentIds)
