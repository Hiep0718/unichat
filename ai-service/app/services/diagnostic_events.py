"""Content-free, idempotent metadata accepted by partial diagnostic storage."""

from typing import Any
from uuid import UUID

FIELDS = frozenset({
    "attemptId", "operationId", "phase", "purpose", "keyId", "provider", "model",
    "occurredAt", "outcome", "errorCode", "latencyMs", "inputTokens", "outputTokens",
})


def diagnostic_event(event: dict[str, Any]) -> dict[str, Any] | None:
    """Discard non-terminal/unidentified records and remove every content field."""
    if event.get("phase") != "END":
        return None
    try:
        UUID(str(event["attemptId"]))
    except (KeyError, ValueError):
        return None
    return {key: value for key, value in event.items() if key in FIELDS}


def unique_events(events: list[dict[str, Any]]) -> list[dict[str, Any]]:
    """Sanitize legacy storage and keep one canonical terminal event per attempt."""
    unique: dict[str, dict[str, Any]] = {}
    for event in events:
        safe = diagnostic_event(event)
        if safe is not None:
            unique.setdefault(str(safe["attemptId"]), safe)
    return list(unique.values())[-500:]
