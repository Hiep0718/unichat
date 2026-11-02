"""Core-authorized attempt checkpoints and durable metadata acknowledgement."""

import time
from dataclasses import dataclass
from datetime import UTC, datetime
from typing import Any, Literal

from app.core.private_core import call_core
from app.core.service_security import ServiceSecurityError

Purpose = Literal[
    "CHAT", "COMPACTION", "QUERY_PLAN", "WORKSPACE_SUMMARY", "ADMIN_PROMPT", "KEY_PROBE"
]
QUERY_PLAN_MAX_OUTPUT_TOKENS = 512


class GenerationPolicyError(ServiceSecurityError):
    """A safe refusal when Core policy or operation lifecycle cannot be verified."""


@dataclass(frozen=True)
class GenerationPolicy:
    """Core-issued context; no authorization is inferred from vector metadata."""

    request_id: str
    operation_id: str | None
    cloud_allowed: bool
    deadline: float

    def checkpoint(self, purpose: Purpose, attempt_id: str | None = None,
                   attempt_limit: float | None = None) -> float:
        """Recheck Core policy before every attempt and emitted answer batch."""
        if not self.cloud_allowed or time.time() >= self.deadline:
            raise GenerationPolicyError(
                "CLOUD_POLICY_DENIED" if not self.cloud_allowed else "DEADLINE_EXCEEDED"
            )
        if self.operation_id is None:
            if purpose not in ("ADMIN_PROMPT", "KEY_PROBE"):
                raise GenerationPolicyError("OPERATION_POLICY_REQUIRED")
            return min(30.0, self.deadline - time.time())
        result = call_core(
            f"/internal/v1/chat-operations/{self.operation_id}/checkpoint",
            {
                "requestId": self.request_id,
                "purpose": purpose,
                "attemptId": attempt_id,
            },
            self.request_id,
            attempt_id or self.operation_id,
        )
        if result.get("allowed") is not True or result.get("cloudAllowed") is not True:
            raise GenerationPolicyError("CORE_POLICY_DENIED")
        remaining = _remaining_seconds(result, self.deadline)
        if remaining <= 0:
            raise GenerationPolicyError("DEADLINE_EXCEEDED")
        timeout = 12.0 if purpose == "QUERY_PLAN" else 30.0
        if purpose == "CHAT" and attempt_limit is not None:
            timeout = min(max(attempt_limit, 30.0), 120.0)
        return min(timeout, remaining)

    def record(self, payload: dict[str, Any]) -> None:
        """Require durable START/END ingestion; content and raw keys are excluded."""
        call_core(
            "/internal/v1/provider-attempts",
            payload,
            self.request_id,
            f"{payload['attemptId']}:{payload['phase']}",
        )
        if payload.get("phase") == "END":
            from app.services.ai_telemetry import telemetry_tracker

            telemetry_tracker.record_event(payload)


def _remaining_seconds(result: dict[str, Any], local_deadline: float) -> float:
    try:
        deadline = datetime.fromisoformat(str(result["deadlineAt"]).replace("Z", "+00:00"))
        return min(local_deadline, deadline.timestamp()) - time.time()
    except (KeyError, ValueError, TypeError) as error:
        raise GenerationPolicyError("CORE_POLICY_INVALID") from error


def attempt_event(
    policy: GenerationPolicy,
    attempt_id: str,
    purpose: Purpose,
    provider: str,
    key_id: str,
    model: str,
    phase: str,
    **result: Any,
) -> dict[str, Any]:
    """Construct the content-free private attempt ingestion contract."""
    return {
        "attemptId": attempt_id,
        "operationId": policy.operation_id,
        "purpose": purpose,
        "provider": provider,
        "keyId": key_id,
        "model": model,
        "phase": phase,
        "occurredAt": datetime.now(UTC).isoformat(),
        "outcome": None,
        "latencyMs": None,
        "inputTokens": None,
        "outputTokens": None,
        "errorCode": None,
        **result,
    }
