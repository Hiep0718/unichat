"""Partial file diagnostics plus real, key-bound probes; Core owns authoritative metrics."""

import json
import logging
import threading
import time
import uuid
from datetime import UTC, datetime, timedelta
from pathlib import Path
from typing import Any

from app.core.rag.generation_policy import GenerationPolicy
from app.core.rag.key_registry import (
    active_provider,
    configured_keys,
    configured_model,
    resolve_key,
)
from app.core.rag.provider_gateway import ProviderFailure, generate
from app.services.diagnostic_events import diagnostic_event, unique_events
from app.services.provider_probes import probe_key
from app.services.telemetry_charts import diagnostic_charts, event_timestamp

logger = logging.getLogger(__name__)


def mask_key(key: str) -> str:
    """Present a small masked prefix/suffix without exposing a provider credential."""
    cleaned = key.strip()
    if not cleaned:
        return "Not Configured"
    return (
        cleaned[:3] + "..." + cleaned[-2:]
        if len(cleaned) <= 10
        else cleaned[:6] + "..." + cleaned[-4:]
    )


class AiTelemetryTracker:
    """Best-effort diagnostics are explicitly partial and never used as billing/quota data."""

    def __init__(self, storage_path: str | None = None) -> None:
        self._lock = threading.Lock()
        self._storage_path = (
            Path(storage_path)
            if storage_path
            else (Path(__file__).resolve().parents[3] / ".tmp" / "telemetry_records.json")
        )
        self._records: list[dict[str, Any]] = self._load()

    def _load(self) -> list[dict[str, Any]]:
        if not self._storage_path.exists():
            return []
        try:
            records = json.loads(self._storage_path.read_text(encoding="utf-8"))
            if not isinstance(records, list):
                raise ValueError("DIAGNOSTIC_FORMAT_INVALID")
            return unique_events([record for record in records[-500:] if isinstance(record, dict)])
        except (OSError, ValueError) as error:
            logger.warning("diagnostic_load_failed code=%s", type(error).__name__)
            return []

    def record_event(self, event: dict[str, Any]) -> None:
        """Persist only actual terminal content-free events; failure is visible in server logs."""
        safe = diagnostic_event(event)
        if safe is None:
            return
        with self._lock:
            if any(record["attemptId"] == safe["attemptId"] for record in self._records):
                return
            self._records.append(safe)
            self._records = self._records[-500:]
            try:
                self._storage_path.parent.mkdir(parents=True, exist_ok=True)
                self._storage_path.write_text(
                    json.dumps(self._records, ensure_ascii=False), encoding="utf-8"
                )
            except OSError as error:
                logger.warning("diagnostic_write_failed code=%s", type(error).__name__)

    def record_call(
        self,
        key_index: int,
        key_name: str,
        model: str,
        status_code: int,
        prompt_tokens: int | None = None,
        candidates_tokens: int | None = None,
        latency_ms: int | None = None,
    ) -> None:
        """Legacy callers remain diagnostic-only; positional key attribution is unverified."""
        self.record_event(
            {
                "attemptId": str(uuid.uuid4()),
                "phase": "END",
                "purpose": "LEGACY_UNVERIFIED",
                "keyId": "legacy-unverified",
                "keyName": key_name,
                "model": model,
                "occurredAt": datetime.now(UTC).isoformat(),
                "outcome": "SUCCESS" if status_code == 200 else "ERROR",
                "errorCode": None if status_code == 200 else f"PROVIDER_HTTP_{status_code}",
                "inputTokens": prompt_tokens,
                "outputTokens": candidates_tokens,
                "latencyMs": latency_ms,
            }
        )

    def get_configured_keys(self) -> list[dict[str, Any]]:
        """Return stable selectable identities from the same resolver used to call providers."""
        return [
            {
                "keyId": key.key_id,
                "name": key.name,
                "maskedKey": mask_key(key.secret),
                "isConfigured": True,
                "provider": key.provider,
                "isActive": key.provider == active_provider(),
                "supportedModels": [configured_model(key.provider)],
            }
            for key in configured_keys()
        ]

    def get_metrics(
        self, days: int = 28, key_id: str | None = None, model_filter: str | None = None
    ) -> dict[str, Any]:
        """Return retained measured diagnostics with explicit incomplete coverage."""
        now = datetime.now(UTC)
        start = now - timedelta(days=days)
        with self._lock:
            records = [
                record
                for record in self._records
                if event_timestamp(record) >= start
                and (key_id is None or record.get("keyId") == key_id)
                and (model_filter in (None, "ALL") or record.get("model") == model_filter)
            ]
        models = sorted({str(record["model"]) for record in records if record.get("model")})
        successes = sum(record.get("outcome") == "SUCCESS" for record in records)
        return {
            "status": "PARTIAL_DIAGNOSTIC" if records else "NO_DATA",
            "authoritative": False,
            "timeRangeDays": days,
            "keys": self.get_configured_keys(),
            "activeProvider": active_provider(),
            "activeModel": configured_model(),
            "configuredModels": sorted({
                configured_model(key.provider) for key in configured_keys()
            }),
            "models": models,
            "window": {"from": start.isoformat(), "to": now.isoformat()},
            "retainedFrom": min(
                (event_timestamp(record).isoformat() for record in records), default=None
            ),
            "completeness": "PARTIAL",
            "sampleCount": len(records),
            "updatedAt": now.isoformat(),
            **diagnostic_charts(records, days, now, models),
            "summary": {
                "totalRequests": len(records),
                "totalErrors": len(records) - successes,
                "overallSuccessRate": round(successes * 100 / len(records), 1) if records else None,
            },
        }

    def verify_key(
        self, key_id: str = "gemini-primary", policy: GenerationPolicy | None = None
    ) -> dict[str, Any]:
        """Run a real metadata probe; missing config never becomes healthy."""
        selected = resolve_key(key_id)
        if selected is None:
            return {
                "status": "UNCONFIGURED" if not configured_keys() else "ERROR",
                "message": "API key chưa cấu hình hoặc không tồn tại.",
                "latencyMs": None,
                "keyId": key_id,
                "probeType": "METADATA",
            }
        if policy is None:
            raise ValueError("ADMIN_POLICY_REQUIRED")
        if selected.provider != active_provider():
            return {
                "status": "ERROR",
                "message": "Khóa không thuộc nhà cung cấp đang hoạt động.",
                "keyId": key_id,
                "probeType": "METADATA",
                "errorCode": "PROVIDER_SELECTION_INVALID",
                "latencyMs": None,
            }
        return probe_key(selected.secret, key_id, policy)

    def quick_prompt(
        self,
        prompt: str,
        key_id: str = "gemini-primary",
        model: str | None = None,
        policy: GenerationPolicy | None = None,
    ) -> dict[str, Any]:
        """Call the selected actual key and report only measured usage."""
        selected = resolve_key(key_id)
        if selected is None:
            return {
                "status": "UNCONFIGURED" if not configured_keys() else "ERROR",
                "reply": None,
                "tokensUsed": None,
                "latencyMs": None,
                "model": model or configured_model(),
                "keyId": key_id,
                "error": True,
            }
        if policy is None:
            raise ValueError("ADMIN_POLICY_REQUIRED")
        if not prompt.strip() or len(prompt) > 2000:
            raise ValueError("ADMIN_PROMPT_INVALID")
        started = time.perf_counter()
        try:
            result = generate(
                prompt, policy, purpose="ADMIN_PROMPT", selected_key=selected, model=model
            )
            usage = (
                result.input_tokens + result.output_tokens
                if (result.input_tokens is not None and result.output_tokens is not None)
                else None
            )
            return {
                "status": "SUCCESS",
                "reply": result.text,
                "tokensUsed": usage,
                "latencyMs": int((time.perf_counter() - started) * 1000),
                "model": result.model,
                "keyId": result.key_id,
                "probeType": "GENERATION",
                "error": False,
            }
        except ProviderFailure as error:
            return {
                "status": "ERROR",
                "reply": None,
                "tokensUsed": None,
                "latencyMs": int((time.perf_counter() - started) * 1000),
                "model": model or configured_model(),
                "keyId": key_id,
                "error": True,
                "errorCode": error.code,
            }


telemetry_tracker = AiTelemetryTracker()
