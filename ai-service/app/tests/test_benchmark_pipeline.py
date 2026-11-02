"""Tests for full benchmark pipeline and report/question generation."""

import tempfile
from pathlib import Path
from unittest.mock import patch

import pytest
from chromadb.errors import NotFoundError

from app.evaluation.benchmark_suite import run_full_benchmark_suite
from app.evaluation.question_generator import (
    EvaluationCorpusUnavailableError,
    generate_draft_dataset,
    load_chunks_from_chroma,
)
from app.evaluation.report import (
    export_grading_sheet,
    generate_markdown_report,
    import_grading_sheet,
)
from app.evaluation.storage import EvaluationResult, EvaluationRun, EvaluationStore


def test_question_generator_draft() -> None:
    with patch(
        "app.evaluation.question_generator.load_chunks_from_chroma",
        return_value=[{"chunk_id": "chunk-1", "text": "Campus policy", "metadata": {}}],
    ):
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


def test_should_fail_evaluation_when_corpus_is_missing() -> None:
    with patch("app.evaluation.question_generator.get_chroma_client") as get_client:
        get_client.return_value.get_collection.side_effect = NotFoundError("missing")
        with pytest.raises(EvaluationCorpusUnavailableError):
            load_chunks_from_chroma("ws-test-123")


def test_should_load_evaluation_chunks_with_source_metadata() -> None:
    result = {
        "documents": ["A source passage."],
        "metadatas": [{"document_id": "doc-1"}],
        "ids": ["chunk-1"],
    }
    with patch("app.evaluation.question_generator.get_chroma_client") as get_client:
        get_client.return_value.get_collection.return_value.get.return_value = result
        chunks = load_chunks_from_chroma("ws-test-123")

    assert chunks == [{
        "chunk_id": "chunk-1",
        "text": "A source passage.",
        "metadata": {"document_id": "doc-1"},
    }]


def test_should_reject_empty_evaluation_corpus() -> None:
    with patch("app.evaluation.question_generator.get_chroma_client") as get_client:
        get_client.return_value.get_collection.return_value.get.return_value = {
            "documents": [],
            "metadatas": [],
            "ids": [],
        }
        with pytest.raises(EvaluationCorpusUnavailableError, match="no chunks"):
            load_chunks_from_chroma("ws-test-123")


def test_should_propagate_evaluation_query_failures() -> None:
    with patch("app.evaluation.question_generator.get_chroma_client") as get_client:
        get_client.return_value.get_collection.return_value.get.side_effect = RuntimeError(
            "query failed"
        )
        with pytest.raises(RuntimeError, match="query failed"):
            load_chunks_from_chroma("ws-test-123")


def test_full_benchmark_suite_mock() -> None:
    cases = [
        {
            "case_id": "CASE-001",
            "question": "What is the concept?",
            "expected_intent": "FACT",
            "target_chunk_ids": ["chunk-1"],
        },
        {
            "case_id": "CASE-002",
            "question": "Summarize the concept.",
            "expected_intent": "SUMMARY",
            "target_chunk_ids": ["chunk-1"],
        },
    ]
    with (
        patch("app.evaluation.benchmark_suite.verify_chromadb_compat", return_value=True),
        patch("app.evaluation.benchmark_suite.generate_draft_dataset", return_value=cases),
        patch("app.evaluation.runner.EvaluationRunner._wait_for_rate_limit"),
    ):
        # Test benchmark suite orchestration
        res = run_full_benchmark_suite(workspace_id="ws-bm-test", run_id="run-test-full", total_cases=2)
        assert res["status"] == "COMPLETED"
        assert res["run_id"] == "run-test-full"
