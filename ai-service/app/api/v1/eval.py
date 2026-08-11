"""Evaluation endpoints reading/writing local JSON (R-06 / R-15 / R-16)."""

from typing import Any

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

from app.evaluation.benchmark_suite import run_full_benchmark_suite
from app.evaluation.question_generator import generate_draft_dataset
from app.evaluation.report import generate_markdown_report
from app.evaluation.storage import EvaluationStore

router = APIRouter()
store = EvaluationStore()


class EvalRunRequest(BaseModel):
    workspaceId: str = Field(..., description="Workspace ID for evaluation")
    runId: str = Field(default="run-bm-latest", description="Unique Run ID")


class QuestionGenRequest(BaseModel):
    workspaceId: str = Field(..., description="Workspace ID")
    totalCases: int = Field(default=120, description="Total cases to generate")


@router.post("/eval/run")
def trigger_eval_suite(request: EvalRunRequest) -> dict[str, Any]:
    return run_full_benchmark_suite(workspace_id=request.workspaceId, run_id=request.runId)


@router.post("/eval/generate-questions")
def generate_questions_endpoint(request: QuestionGenRequest) -> list[dict[str, Any]]:
    return generate_draft_dataset(workspace_id=request.workspaceId, total_cases=request.totalCases)


@router.get("/eval/runs")
def list_runs_endpoint() -> list[dict[str, Any]]:
    return store.list_runs()


@router.get("/eval/runs/{runId}/results")
def get_run_results_endpoint(runId: str) -> list[dict[str, Any]]:
    results = store.load_results(runId)
    if not results:
        raise HTTPException(status_code=404, detail="Run results not found")
    return results


@router.get("/eval/runs/{runId}/report")
def get_run_report_endpoint(runId: str) -> dict[str, str]:
    try:
        report_md = generate_markdown_report(runId, store=store)
        return {"run_id": runId, "report": report_md}
    except Exception as e:
        raise HTTPException(status_code=404, detail=f"Report generation failed: {e}")
