"""Tests for evaluation metrics and Bootstrap CI (R-13)."""

from app.evaluation.metrics import (
    calculate_percentile,
    compute_aggregate_metrics,
    paired_bootstrap_ci,
)


def test_paired_bootstrap_ci() -> None:
    b_scores = [0.5, 0.6, 0.7, 0.4, 0.5]
    a_scores = [0.8, 0.9, 0.85, 0.7, 0.8]

    mean_diff, lo, hi = paired_bootstrap_ci(b_scores, a_scores, n_bootstrap=100)
    assert mean_diff > 0.1
    assert lo <= mean_diff <= hi


def test_percentile_calc() -> None:
    vals = [10.0, 20.0, 30.0, 40.0, 50.0]
    p50 = calculate_percentile(vals, 50)
    assert p50 == 30.0


def test_compute_aggregate_metrics() -> None:
    results = [
        {
            "intent_matched": True,
            "source_hit": True,
            "citation_valid": True,
            "mrr": 1.0,
            "latency_ms": 100.0,
            "answer_score": 2,
        },
        {
            "intent_matched": False,
            "source_hit": False,
            "citation_valid": False,
            "mrr": 0.0,
            "latency_ms": 200.0,
            "answer_score": 1,
        },
    ]

    metrics = compute_aggregate_metrics(results)
    assert metrics["intent_accuracy"] == 0.5
    assert metrics["source_hit_rate"] == 0.5
    assert metrics["mean_mrr"] == 0.5
    assert metrics["avg_answer_score"] == 1.5
