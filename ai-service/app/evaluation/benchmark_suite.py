"""Benchmark Suite Pipeline orchestrating Phase 0 to Phase 4 (R-16 / R-18)."""

from typing import Any

import structlog

from app.evaluation.question_generator import generate_draft_dataset
from app.evaluation.report import export_grading_sheet, generate_markdown_report
from app.evaluation.runner import EvaluationRunner
from app.evaluation.storage import EvaluationRun, EvaluationStore
from app.services.preflight_check import verify_chromadb_compat

logger = structlog.get_logger(__name__)


def run_full_benchmark_suite(
    workspace_id: str,
    run_id: str = "run-bm-latest",
    total_cases: int = 120,
    dataset_version: str = "v1.0",
    strategy_version: str = "v2.0",
    config_hash: str = "hash-v2-hybrid",
) -> dict[str, Any]:
    """Execute complete benchmark suite end-to-end."""
    logger.info("Step 1: Preflight checks (R-02)")
    chroma_ok = verify_chromadb_compat()
    if not chroma_ok:
        logger.warning("ChromaDB compatibility check warned, continuing with fallback")

    logger.info("Step 2: Generate / Load evaluation dataset (R-10)")
    dataset = generate_draft_dataset(workspace_id=workspace_id, total_cases=total_cases)

    store = EvaluationStore()
    run = EvaluationRun(
        run_id=run_id,
        dataset_version=dataset_version,
        strategy_version=strategy_version,
        config_hash=config_hash,
        total_cases=len(dataset),
        note="Benchmark paired run v1 vs v2",
    )
    store.save_run(run)

    logger.info("Step 3: Run paired evaluation (R-12 Rate limited)")
    runner = EvaluationRunner(store=store)
    results = runner.run_paired(run_id=run_id, dataset=dataset)

    run.status = "COMPLETED"
    run.completed_cases = len(results) // 2
    store.save_run(run)

    logger.info("Step 4: Export grading sheet (R-14 Pass 1 -> Pass 2)")
    sheet_path = store.reports_dir / f"{run_id}_grading_sheet.json"
    export_grading_sheet(run_id, sheet_path, store=store)

    logger.info("Step 5: Generate evaluation report")
    report_md = generate_markdown_report(run_id, store=store)
    report_path = store.reports_dir / f"{run_id}.md"
    report_path.write_text(report_md, encoding="utf-8")

    logger.info("BENCHMARK SUITE COMPLETED SUCCESSFULLY", run_id=run_id, report=str(report_path))
    return {
        "run_id": run_id,
        "status": "COMPLETED",
        "total_cases": len(dataset),
        "results_count": len(results),
        "grading_sheet": str(sheet_path),
        "report_path": str(report_path),
    }
