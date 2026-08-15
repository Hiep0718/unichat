"""Report generator and manual answer grading sheet export/import (R-14)."""

import json
from pathlib import Path
from typing import Any

from app.evaluation.metrics import compute_aggregate_metrics, paired_bootstrap_ci
from app.evaluation.storage import EvaluationStore


def export_grading_sheet(run_id: str, output_path: Path, store: EvaluationStore | None = None) -> Path:
    """Export results needing manual answer grading (Pass 1 -> Pass 2) (R-14)."""
    st = store or EvaluationStore()
    results = st.load_results(run_id)

    sheet_items: list[dict[str, Any]] = []
    for r in results:
        sheet_items.append({
            "run_id": r.get("run_id"),
            "case_id": r.get("case_id"),
            "branch": r.get("branch"),
            "question": r.get("question"),
            "expected_intent": r.get("expected_intent"),
            "predicted_intent": r.get("predicted_intent"),
            "answer_score": r.get("answer_score"),  # User fills 0, 1, or 2
            "comment": "",
        })

    output_path.write_text(json.dumps(sheet_items, indent=2, ensure_ascii=False), encoding="utf-8")
    return output_path


def import_grading_sheet(run_id: str, input_path: Path, store: EvaluationStore | None = None) -> None:
    """Import manually graded answer scores back into run results (Pass 2) (R-14)."""
    st = store or EvaluationStore()
    results = st.load_results(run_id)
    sheet_data = json.loads(input_path.read_text(encoding="utf-8"))

    score_map: dict[str, int] = {}
    for item in sheet_data:
        key = f"{item['case_id']}_{item['branch']}"
        if item.get("answer_score") is not None:
            score_map[key] = int(item["answer_score"])

    # Update results
    for r in results:
        key = f"{r['case_id']}_{r['branch']}"
        if key in score_map:
            r["answer_score"] = score_map[key]

    # Re-save updated results JSONL
    res_file = st.results_dir / f"{run_id}.jsonl"
    with res_file.open("w", encoding="utf-8") as f:
        for r in results:
            f.write(json.dumps(r, ensure_ascii=False) + "\n")


def generate_markdown_report(run_id: str, store: EvaluationStore | None = None) -> str:
    """Generate comprehensive Markdown evaluation report."""
    st = store or EvaluationStore()
    run = st.load_run(run_id)
    results = st.load_results(run_id)

    baseline_res = [r for r in results if r.get("branch") == "BASELINE"]
    adaptive_res = [r for r in results if r.get("branch") == "ADAPTIVE"]

    b_metrics = compute_aggregate_metrics(baseline_res)
    a_metrics = compute_aggregate_metrics(adaptive_res)

    # Paired Bootstrap CI for source hit rate
    b_hits = [1.0 if r.get("source_hit") else 0.0 for r in baseline_res]
    a_hits = [1.0 if r.get("source_hit") else 0.0 for r in adaptive_res]
    mean_diff, ci_lo, ci_hi = paired_bootstrap_ci(b_hits, a_hits)

    note = "> [!NOTE]\n> Status: Answer Score - Pending manual grading (R-14 Pass 1 complete).\n" if a_metrics.get("pending_manual_grading") else ""

    report = f"""# Evaluation Report — Run {run_id}

**Dataset Version**: {run.get('dataset_version')}
**Strategy Version**: {run.get('strategy_version')}
**Config Hash**: `{run.get('config_hash')}`

{note}

## Summary Metrics Comparison

| Metric | Baseline (v1) | Adaptive (v2) | Delta / Paired CI (95%) |
|---|---|---|---|
| Intent Accuracy | {b_metrics.get('intent_accuracy', 0):.2%} | {a_metrics.get('intent_accuracy', 0):.2%} | +{(a_metrics.get('intent_accuracy', 0) - b_metrics.get('intent_accuracy', 0)):.2%} |
| Source Hit Rate | {b_metrics.get('source_hit_rate', 0):.2%} | {a_metrics.get('source_hit_rate', 0):.2%} | Diff: {mean_diff:+.2f} [{ci_lo:+.2f}, {ci_hi:+.2f}] |
| Citation Accuracy | {b_metrics.get('citation_accuracy', 0):.2%} | {a_metrics.get('citation_accuracy', 0):.2%} | +{(a_metrics.get('citation_accuracy', 0) - b_metrics.get('citation_accuracy', 0)):.2%} |
| Mean MRR | {b_metrics.get('mean_mrr', 0):.3f} | {a_metrics.get('mean_mrr', 0):.3f} | +{(a_metrics.get('mean_mrr', 0) - b_metrics.get('mean_mrr', 0)):.3f} |
| Latency p50 | {b_metrics.get('latency_p50', 0):.1f} ms | {a_metrics.get('latency_p50', 0):.1f} ms | - |
| Latency p95 | {b_metrics.get('latency_p95', 0):.1f} ms | {a_metrics.get('latency_p95', 0):.1f} ms | - |
| Avg Answer Score | {b_metrics.get('avg_answer_score') or 'N/A'} | {a_metrics.get('avg_answer_score') or 'N/A'} | - |
"""
    return report
