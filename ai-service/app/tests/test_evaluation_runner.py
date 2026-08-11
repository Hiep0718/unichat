"""Tests for paired evaluation runner (R-12)."""

import tempfile
from pathlib import Path

from app.evaluation.runner import EvaluationRunner
from app.evaluation.storage import EvaluationStore


from unittest.mock import patch

def test_evaluation_runner_paired() -> None:
    with tempfile.TemporaryDirectory() as tmpdir, \
         patch("app.evaluation.runner.EvaluationRunner._wait_for_rate_limit"):
        store = EvaluationStore(base_dir=Path(tmpdir))
        runner = EvaluationRunner(store=store)

        dataset = [
            {
                "case_id": "CASE-001",
                "question": "Quy chế đào tạo tín chỉ?",
                "expected_intent": "FACT",
                "target_chunk_ids": ["c1"],
            },
            {
                "case_id": "CASE-002",
                "question": "So sánh môn A và môn B?",
                "expected_intent": "COMPARISON",
                "target_chunk_ids": ["c2", "c3"],
            },
        ]

        results = runner.run_paired(run_id="test-run-runner", dataset=dataset)
        assert len(results) == 4  # 2 cases x 2 branches (BASELINE, ADAPTIVE)

        # Check saved checkpoint
        saved = store.load_results("test-run-runner")
        assert len(saved) == 4
