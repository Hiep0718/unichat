from app.services.eval_runner import run_evaluation_suite


def test_eval_runner_suite_execution() -> None:
    report = run_evaluation_suite("ws-123", ["doc-456"])
    assert report["suite"] == "unichat_p0_benchmark_v1"
    assert report["total_samples"] == 3
    assert "intent_accuracy" in report
    assert "pass_rate" in report
