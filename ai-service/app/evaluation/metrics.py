"""Evaluation metrics & Paired Bootstrap CI calculation using stdlib random (R-13)."""

import math
import random
from typing import Any


def paired_bootstrap_ci(
    baseline_scores: list[float],
    adaptive_scores: list[float],
    n_bootstrap: int = 1000,
    confidence: float = 0.95,
) -> tuple[float, float, float]:
    """Calculate mean difference and 95% paired bootstrap CI using Python stdlib random (R-13).

    Returns:
        tuple (mean_diff, ci_lower, ci_upper)
    """
    if not baseline_scores or not adaptive_scores or len(baseline_scores) != len(adaptive_scores):
        return 0.0, 0.0, 0.0

    n = len(baseline_scores)
    diffs: list[float] = []

    for _ in range(n_bootstrap):
        indices = [random.randint(0, n - 1) for _ in range(n)]
        b_sample = [baseline_scores[i] for i in indices]
        a_sample = [adaptive_scores[i] for i in indices]
        diff = (sum(a_sample) / n) - (sum(b_sample) / n)
        diffs.append(diff)

    diffs.sort()
    alpha = (1.0 - confidence) / 2.0
    lo_idx = int(alpha * n_bootstrap)
    hi_idx = int((1.0 - alpha) * n_bootstrap)

    lo = diffs[lo_idx]
    hi = diffs[hi_idx]
    mean_diff = sum(diffs) / len(diffs)

    return mean_diff, lo, hi


def calculate_percentile(values: list[float], percentile: float) -> float:
    """Calculate percentile value from a list of numbers."""
    if not values:
        return 0.0
    sorted_vals = sorted(values)
    k = (len(sorted_vals) - 1) * (percentile / 100.0)
    f = math.floor(k)
    c = math.ceil(k)
    if f == c:
        return sorted_vals[int(k)]
    d0 = sorted_vals[int(f)] * (c - k)
    d1 = sorted_vals[int(c)] * (k - f)
    return d0 + d1


def compute_aggregate_metrics(results: list[dict[str, Any]]) -> dict[str, Any]:
    """Compute aggregate evaluation metrics for a list of case result dicts."""
    if not results:
        return {}

    total = len(results)
    matched_intents = sum(1 for r in results if r.get("intent_matched"))
    source_hits = sum(1 for r in results if r.get("source_hit"))
    valid_citations = sum(1 for r in results if r.get("citation_valid"))

    mrrs = [r.get("mrr", 0.0) for r in results]
    latencies = [r.get("latency_ms", 0.0) for r in results]

    answer_scores: list[float] = [float(r["answer_score"]) for r in results if r.get("answer_score") is not None]
    avg_answer_score = sum(answer_scores) / len(answer_scores) if answer_scores else None

    return {
        "total_cases": total,
        "intent_accuracy": matched_intents / total,
        "source_hit_rate": source_hits / total,
        "citation_accuracy": valid_citations / total,
        "mean_mrr": sum(mrrs) / total,
        "latency_p50": calculate_percentile(latencies, 50),
        "latency_p95": calculate_percentile(latencies, 95),
        "avg_answer_score": avg_answer_score,
        "pending_manual_grading": len(answer_scores) < total,
    }
