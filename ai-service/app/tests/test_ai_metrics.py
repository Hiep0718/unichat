"""Stable provider identity and truthful diagnostic/probe boundary tests."""

import json
from datetime import UTC, datetime
from pathlib import Path
from typing import Any
from unittest.mock import Mock, patch
from uuid import uuid4

import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient

from app.api.v1.ai_metrics import router
from app.core.rag.generation_policy import GenerationPolicy
from app.core.rag.key_registry import configured_keys
from app.core.rag.provider_gateway import ProviderFailure, ProviderResult
from app.services.ai_telemetry import AiTelemetryTracker, mask_key
from app.tests.plan_v2_fixtures import api_client


@pytest.fixture(autouse=True)
def clear_keys(monkeypatch: pytest.MonkeyPatch) -> None:
    for name in ("GEMINI_API_KEY", "GEMINI_API_KEYS", "GEMINI_API_KEY_2",
                 "GEMINI_API_KEY_SECONDARY"):
        monkeypatch.setenv(name, "")


def test_should_mask_credentials() -> None:
    assert mask_key("AIzaSyD-1234567890abcdef") == "AIzaSy...cdef"
    assert mask_key("") == "Not Configured"
    assert mask_key("short") == "sho...rt"


def test_should_report_no_data_instead_of_synthetic_usage(tmp_path: Path) -> None:
    tracker = AiTelemetryTracker(str(tmp_path / "metrics.json"))
    metrics = tracker.get_metrics(days=7)
    assert metrics["status"] == "NO_DATA"
    assert metrics["sampleCount"] == 0
    assert metrics["authoritative"] is False
    assert metrics["summary"]["overallSuccessRate"] is None
    assert metrics["retainedFrom"] is None
    assert len(metrics["chartRequestsSuccess"]) == 7
    assert all(row["successRate"] is None for row in metrics["chartRequestsSuccess"])


def test_should_ingest_idempotent_metadata_and_keep_unknown_usage_null(tmp_path: Path) -> None:
    tracker = AiTelemetryTracker(str(tmp_path / "metrics.json"))
    event = {"attemptId": str(uuid4()), "phase": "END", "purpose": "CHAT",
             "keyId": "gemini-primary", "provider": "gemini", "model": "test-model",
             "occurredAt": datetime.now(UTC).isoformat(), "outcome": "SUCCESS",
             "latencyMs": 20, "inputTokens": None, "outputTokens": None}
    tracker.record_event(event)
    tracker.record_event(event)
    metrics = tracker.get_metrics(days=7)
    assert metrics["sampleCount"] == 1
    assert metrics["completeness"] == "PARTIAL"
    assert metrics["status"] == "PARTIAL_DIAGNOSTIC"
    assert metrics["chartInputTokens"][-1]["test-model"] is None
    assert metrics["summary"]["overallSuccessRate"] == 100
    assert AiTelemetryTracker(str(tmp_path / "metrics.json")).get_metrics()["sampleCount"] == 1


def test_should_redact_content_from_file_diagnostics(tmp_path: Path) -> None:
    path = tmp_path / "metrics.json"
    tracker = AiTelemetryTracker(str(path))
    tracker.record_event({"attemptId": str(uuid4()), "phase": "END",
                          "occurredAt": datetime.now(UTC).isoformat(),
                          "outcome": "ERROR", "prompt": "secret prompt", "token": "secret token",
                          "excerpt": "secret document", "inputTokens": None})
    contents = path.read_text()
    assert "secret" not in contents
    assert "prompt" not in json.loads(contents)[0]


def test_should_not_probe_or_generate_when_unconfigured(tmp_path: Path) -> None:
    tracker = AiTelemetryTracker(str(tmp_path / "metrics.json"))
    with patch("app.services.provider_probes.genai.Client") as provider:
        assert tracker.verify_key()["status"] == "UNCONFIGURED"
        result = tracker.quick_prompt("Admin direct prompt")
    assert result["status"] == "UNCONFIGURED"
    assert result["latencyMs"] is None
    assert result["tokensUsed"] is None
    provider.assert_not_called()


def test_should_keep_selected_secondary_identity_and_actual_key(monkeypatch: pytest.MonkeyPatch, tmp_path: Path) -> None:
    monkeypatch.setenv("GEMINI_API_KEY", "primary-test-key")
    monkeypatch.setenv("GEMINI_API_KEY_2", "secondary-test-key")
    tracker = AiTelemetryTracker(str(tmp_path / "metrics.json"))
    context = Mock(spec=GenerationPolicy)
    result = ProviderResult("reply", "gemini", "test-model", "gemini-secondary", 2, 3)
    with patch("app.services.ai_telemetry.generate", return_value=result) as provider:
        response = tracker.quick_prompt("Only direct admin prompt", "gemini-secondary",
                                        "test-model", context)
    assert response["keyId"] == "gemini-secondary"
    assert response["tokensUsed"] == 5
    assert provider.call_args.kwargs["selected_key"].secret == "secondary-test-key"  # noqa: S105 -- Offline fixture.
    assert provider.call_args.kwargs["purpose"] == "ADMIN_PROMPT"
    assert provider.call_args.args[0] == "Only direct admin prompt"
    assert [key.key_id for key in configured_keys()] == ["gemini-primary", "gemini-secondary"]


def test_should_probe_metadata_using_selected_secondary_key(monkeypatch: pytest.MonkeyPatch, tmp_path: Path) -> None:
    monkeypatch.setenv("GEMINI_API_KEY_2", "secondary-test-key")
    tracker = AiTelemetryTracker(str(tmp_path / "metrics.json"))
    context = Mock(spec=GenerationPolicy)
    context.request_id, context.operation_id = "req-test", None
    context.checkpoint.return_value = 30
    with patch("app.services.provider_probes.genai.Client") as provider:
        result = tracker.verify_key("gemini-secondary", context)
    assert result["status"] == "HEALTHY"
    assert result["probeType"] == "METADATA"
    assert provider.call_args.kwargs["api_key"] == "secondary-test-key"
    assert context.record.call_args_list[0].args[0]["phase"] == "START"
    assert context.record.call_args_list[1].args[0]["purpose"] == "KEY_PROBE"


def test_should_report_provider_error_without_fake_success(monkeypatch: pytest.MonkeyPatch, tmp_path: Path) -> None:
    monkeypatch.setenv("GEMINI_API_KEY", "primary-test-key")
    tracker = AiTelemetryTracker(str(tmp_path / "metrics.json"))
    with patch("app.services.ai_telemetry.generate", side_effect=ProviderFailure("PROVIDER_AUTH")):
        result = tracker.quick_prompt("prompt", policy=Mock(spec=GenerationPolicy))
    assert result["status"] == "ERROR"
    assert result["reply"] is None
    assert result["tokensUsed"] is None


def test_should_reject_unauthenticated_metrics_request() -> None:
    application = FastAPI()
    application.include_router(router, prefix="/internal/v1")
    assert TestClient(application).get("/internal/v1/metrics/ai").status_code == 401


@pytest.mark.parametrize("query", ["days=0", "days=91", "keyId=invalid/key", "model=bad@model"])
def test_should_validate_diagnostic_filters(query: str) -> None:
    response = api_client(router).get("/internal/v1/metrics/ai?" + query)
    assert response.status_code == 422


@pytest.mark.parametrize("body", [{"keyIndex": 1}, {"keyId": "bad/id"},
                                 {"prompt": ""}, {"prompt": "x" * 2001}])
def test_should_validate_key_and_prompt_dtos(body: dict[str, Any]) -> None:
    route = "quick-prompt" if "prompt" in body else "verify-key"
    response = api_client(router).post("/internal/v1/metrics/ai/" + route, json=body)
    assert response.status_code == 422


def test_should_return_unconfigured_to_authorized_admin_probe() -> None:
    response = api_client(router).post("/internal/v1/metrics/ai/verify-key",
                                      json={"keyId": "gemini-primary"})
    assert response.status_code == 200
    assert response.json()["status"] == "UNCONFIGURED"
