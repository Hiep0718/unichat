"""Real Gemini metadata probes with durable attempt acknowledgements."""

import time
import uuid
from datetime import UTC, datetime
from typing import Any

from google import genai
from google.genai import types

from app.core.rag.generation_policy import GenerationPolicy, attempt_event
from app.core.rag.key_registry import configured_model
from app.core.rag.provider_gateway import classify_failure


def probe_key(secret: str, key_id: str, policy: GenerationPolicy) -> dict[str, Any]:
    timeout = policy.checkpoint("KEY_PROBE")
    attempt_id, model = str(uuid.uuid4()), configured_model()
    event = attempt_event(policy, attempt_id, "KEY_PROBE", "gemini", key_id, model, "START")
    policy.record(event)
    started = time.perf_counter()
    try:
        with genai.Client(
            api_key=secret, http_options=types.HttpOptions(timeout=int(timeout * 1000))
        ) as client:
            client.models.get(model=model)
    except Exception as error:
        failure = classify_failure(error)
        policy.record(
            {
                **event,
                "phase": "END",
                "occurredAt": datetime.now(UTC).isoformat(),
                "outcome": "ERROR",
                "errorCode": failure.code,
                "latencyMs": int((time.perf_counter() - started) * 1000),
            }
        )
        return {
            "status": "ERROR",
            "message": "Không thể kiểm tra cấu hình mô hình.",
            "keyId": key_id,
            "probeType": "METADATA",
            "latencyMs": int((time.perf_counter() - started) * 1000),
            "errorCode": failure.code,
        }
    duration = int((time.perf_counter() - started) * 1000)
    policy.record(
        {
            **event,
            "phase": "END",
            "occurredAt": datetime.now(UTC).isoformat(),
            "outcome": "SUCCESS",
            "latencyMs": duration,
        }
    )
    return {
        "status": "HEALTHY",
        "message": "Đã kiểm tra metadata mô hình; chưa kiểm tra sinh nội dung.",
        "keyId": key_id,
        "probeType": "METADATA",
        "latencyMs": duration,
    }


