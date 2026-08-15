"""File-based evaluation storage (R-06 / R-15).

Independent of PostgreSQL — stores evaluation metadata, JSONL results, and full traces.
"""

import json
from dataclasses import asdict, dataclass, field
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

EVAL_DATA_DIR = Path("data/evaluation")


@dataclass
class EvaluationRun:
    run_id: str
    dataset_version: str
    strategy_version: str
    config_hash: str
    started_at: str = field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    completed_at: str | None = None
    status: str = "IN_PROGRESS"
    total_cases: int = 0
    completed_cases: int = 0
    note: str = ""


@dataclass
class EvaluationResult:
    run_id: str
    case_id: str
    branch: str  # BASELINE or ADAPTIVE
    question: str
    expected_intent: str
    predicted_intent: str | None
    intent_matched: bool
    retrieved_chunk_ids: list[str]
    source_hit: bool
    mrr: float
    citation_valid: bool
    refusal_code: str | None
    latency_ms: float
    prompt_tokens: int
    completion_tokens: int
    answer_score: int | None = None  # Manual grade 0, 1, or 2 (R-14)


class EvaluationStore:
    def __init__(self, base_dir: Path = EVAL_DATA_DIR) -> None:
        self.base_dir = base_dir
        self.runs_dir = self.base_dir / "runs"
        self.results_dir = self.base_dir / "results"
        self.traces_dir = self.base_dir / "traces"
        self.datasets_dir = self.base_dir / "datasets"
        self.reports_dir = self.base_dir / "reports"

        for d in (self.runs_dir, self.results_dir, self.traces_dir, self.datasets_dir, self.reports_dir):
            d.mkdir(parents=True, exist_ok=True)

    def save_run(self, run: EvaluationRun) -> Path:
        path = self.runs_dir / f"{run.run_id}.json"
        path.write_text(json.dumps(asdict(run), indent=2, ensure_ascii=False), encoding="utf-8")
        return path

    def load_run(self, run_id: str) -> dict[str, Any]:
        path = self.runs_dir / f"{run_id}.json"
        if not path.exists():
            raise FileNotFoundError(f"Run {run_id} not found")
        return json.loads(path.read_text(encoding="utf-8"))  # type: ignore[no-any-return]

    def list_runs(self) -> list[dict[str, Any]]:
        runs: list[dict[str, Any]] = []
        for p in sorted(self.runs_dir.glob("*.json"), reverse=True):
            runs.append(json.loads(p.read_text(encoding="utf-8")))
        return runs

    def save_results(self, run_id: str, results: list[EvaluationResult]) -> Path:
        path = self.results_dir / f"{run_id}.jsonl"
        with path.open("w", encoding="utf-8") as f:
            for r in results:
                f.write(json.dumps(asdict(r), ensure_ascii=False) + "\n")
        return path

    def load_results(self, run_id: str) -> list[dict[str, Any]]:
        path = self.results_dir / f"{run_id}.jsonl"
        if not path.exists():
            return []
        results: list[dict[str, Any]] = []
        with path.open("r", encoding="utf-8") as f:
            for line in f:
                if line.strip():
                    results.append(json.loads(line))
        return results

    def save_trace(self, run_id: str, case_id: str, trace: dict[str, Any]) -> Path:
        case_trace_dir = self.traces_dir / run_id
        case_trace_dir.mkdir(parents=True, exist_ok=True)
        path = case_trace_dir / f"{case_id}.json"
        path.write_text(json.dumps(trace, indent=2, ensure_ascii=False), encoding="utf-8")
        return path
