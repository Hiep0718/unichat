"""Tests for local JSON/JSONL evaluation storage (R-06 / R-15)."""

import tempfile
from pathlib import Path

from app.evaluation.storage import EvaluationResult, EvaluationRun, EvaluationStore


def test_evaluation_store_save_load() -> None:
    with tempfile.TemporaryDirectory() as tmpdir:
        store = EvaluationStore(base_dir=Path(tmpdir))

        run = EvaluationRun(
            run_id="run-test-01",
            dataset_version="v1.0",
            strategy_version="v1.0",
            config_hash="abc123hash",
            total_cases=10,
        )
        store.save_run(run)

        loaded_run = store.load_run("run-test-01")
        assert loaded_run["run_id"] == "run-test-01"
        assert loaded_run["total_cases"] == 10

        res = EvaluationResult(
            run_id="run-test-01",
            case_id="CASE-001",
            branch="ADAPTIVE",
            question="Quy chế là gì?",
            expected_intent="DEFINITION",
            predicted_intent="DEFINITION",
            intent_matched=True,
            retrieved_chunk_ids=["c1", "c2"],
            source_hit=True,
            mrr=1.0,
            citation_valid=True,
            refusal_code=None,
            latency_ms=120.5,
            prompt_tokens=100,
            completion_tokens=50,
        )
        store.save_results("run-test-01", [res])

        loaded_results = store.load_results("run-test-01")
        assert len(loaded_results) == 1
        assert loaded_results[0]["case_id"] == "CASE-001"
        assert loaded_results[0]["branch"] == "ADAPTIVE"
