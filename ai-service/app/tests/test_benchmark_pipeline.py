"""Tests for full benchmark pipeline and report/question generation."""

import tempfile
from pathlib import Path

from app.evaluation.benchmark_suite import run_full_benchmark_suite
from app.evaluation.question_generator import generate_draft_dataset
from app.evaluation.report import export_grading_sheet, generate_markdown_report, import_grading_sheet
from app.evaluation.storage import EvaluationResult, EvaluationRun, EvaluationStore


def test_question_generator_draft() -> None:
    cases = generate_draft_dataset(workspace_id="ws-test-123", total_cases=20)
    assert len(cases) == 20
    assert any(c["category"] == "DIRECT" for c in cases)
    assert any(c["category"] == "PARAPHRASED" for c in cases)
    assert any(c["category"] == "ADVERSARIAL" for c in cases)
    assert any(c["category"] == "OUT_OF_SCOPE" for c in cases)


def test_report_generation_and_grading() -> None:
    with tempfile.TemporaryDirectory() as tmpdir:
        store = EvaluationStore(base_dir=Path(tmpdir))

        run = EvaluationRun(
            run_id="run-report-01",
            dataset_version="v1.0",
            strategy_version="v2.0",
            config_hash="test-hash",
            total_cases=2,
        )
        store.save_run(run)

        r1 = EvaluationResult(
            run_id="run-report-01",
            case_id="CASE-001",
            branch="BASELINE",
            question="Q1?",
            expected_intent="FACT",
            predicted_intent="FACT",
            intent_matched=True,
            retrieved_chunk_ids=["c1"],
            source_hit=True,
            mrr=1.0,
            citation_valid=True,
            refusal_code=None,
            latency_ms=100.0,
            prompt_tokens=50,
            completion_tokens=20,
        )
        r2 = EvaluationResult(
            run_id="run-report-01",
            case_id="CASE-001",
            branch="ADAPTIVE",
            question="Q1?",
            expected_intent="FACT",
            predicted_intent="FACT",
            intent_matched=True,
            retrieved_chunk_ids=["c1"],
            source_hit=True,
            mrr=1.0,
            citation_valid=True,
            refusal_code=None,
            latency_ms=80.0,
            prompt_tokens=50,
            completion_tokens=20,
        )
        store.save_results("run-report-01", [r1, r2])

        sheet_path = Path(tmpdir) / "sheet.json"
        export_grading_sheet("run-report-01", sheet_path, store=store)
        assert sheet_path.exists()

        import_grading_sheet("run-report-01", sheet_path, store=store)

        report = generate_markdown_report("run-report-01", store=store)
        assert "# Evaluation Report — Run run-report-01" in report
        assert "BASELINE" in report or "Baseline" in report


from unittest.mock import patch

def test_full_benchmark_suite_mock() -> None:
    with tempfile.TemporaryDirectory() as tmpdir, \
         patch("app.evaluation.runner.EvaluationRunner._wait_for_rate_limit"):
        # Test benchmark suite orchestration
        res = run_full_benchmark_suite(workspace_id="ws-bm-test", run_id="run-test-full", total_cases=2)
        assert res["status"] == "COMPLETED"
        assert res["run_id"] == "run-test-full"
