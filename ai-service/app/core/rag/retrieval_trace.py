"""Structured Retrieval Trace Logger.

Logs audit-compliant retrieval trace records without storing raw chunk text or sensitive questions.
"""

from dataclasses import asdict, dataclass, field
from datetime import datetime, timezone
import logging
from typing import Any

logger = logging.getLogger("unichat.retrieval_trace")


@dataclass
class RetrievalTrace:
    request_id: str
    workspace_id: str
    intent: str
    rule_id: str
    confidence: float
    strategy_version: str
    config_hash: str
    allowed_document_count: int
    retrieved_chunk_ids: list[str] = field(default_factory=list)
    evidence_score: float = 0.0
    decision: str = "REFUSE"
    refusal_code: str | None = None
    provider: str = "none"
    latency_ms: float = 0.0
    timestamp_utc: str = field(
        default_factory=lambda: datetime.now(timezone.utc).isoformat()
    )

    def to_dict(self) -> dict[str, Any]:
        return asdict(self)


import json
from pathlib import Path

TRACE_DIR = Path(__file__).parent.parent.parent / "data" / "traces"


def record_trace(trace: RetrievalTrace) -> None:
    """Log structured trace record for observability and persist to JSONL file."""
    trace_data = trace.to_dict()
    logger.info("RETRIEVAL_TRACE %s", trace_data)

    try:
        TRACE_DIR.mkdir(parents=True, exist_ok=True)
        trace_file = TRACE_DIR / "retrieval_traces.jsonl"
        with trace_file.open("a", encoding="utf-8") as f:
            f.write(json.dumps(trace_data, ensure_ascii=False) + "\n")
    except Exception:
        logger.exception("Failed to persist retrieval trace to disk")
