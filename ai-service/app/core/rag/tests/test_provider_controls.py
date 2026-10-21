"""Offline probes and durable control acknowledgements fail closed."""

import time
from unittest.mock import Mock, patch

import pytest

from app.core.rag.generation_policy import GenerationPolicy, GenerationPolicyError, Purpose
from app.core.rag.key_registry import ProviderKey
from app.core.rag.provider_contracts import ProviderFailure, ProviderResult
from app.core.service_security import ServiceSecurityError
from app.services.provider_probes import probe_key
from app.tests.test_llm_provider_fallback import fake_policy


@pytest.mark.parametrize("failure", [None, ProviderFailure("PROVIDER_HTTP_401")])
def test_should_probe_hive_through_generation_with_truthful_metadata(
    failure: ProviderFailure | None,
) -> None:
    key = ProviderKey("hive-primary", "PRIMARY", "fixture-secret", "hive")
    result = ProviderResult("HIVE_OK", "hive", "configured-model", key.key_id)
    with patch("app.services.provider_probes.resolve_key", return_value=key):
        with patch("app.services.provider_probes.active_provider", return_value="hive"):
            with patch("app.services.provider_probes.generate", return_value=result,
                       side_effect=failure) as generation:
                response = probe_key(key.secret, key.key_id, fake_policy())
    assert response["probeType"] == "GENERATION"
    assert response["status"] == ("ERROR" if failure else "HEALTHY")
    assert response["keyId"] == key.key_id
    assert generation.call_args.kwargs["purpose"] == "KEY_PROBE"
    assert generation.call_args.kwargs["selected_key"] == key


@pytest.mark.parametrize("resolved,active,code", [
    (None, "hive", "PROVIDER_KEY_UNKNOWN"),
    (ProviderKey("hive-primary", "PRIMARY", "different", "hive"), "hive", "PROVIDER_KEY_UNKNOWN"),
    (ProviderKey("hive-primary", "PRIMARY", "fixture-secret", "hive"), "gemini",
     "PROVIDER_SELECTION_INVALID"),
])
def test_should_reject_unowned_probe_selection_before_provider_call(
    resolved: ProviderKey | None, active: str, code: str,
) -> None:
    with patch("app.services.provider_probes.resolve_key", return_value=resolved):
        with patch("app.services.provider_probes.active_provider", return_value=active):
            with patch("app.services.provider_probes.generate") as generation:
                with pytest.raises(ProviderFailure, match=code):
                    probe_key("fixture-secret", "hive-primary", fake_policy())
    generation.assert_not_called()


def test_should_propagate_core_denial_from_hive_probe_without_healthy_result() -> None:
    key = ProviderKey("hive-primary", "PRIMARY", "fixture-secret", "hive")
    with patch("app.services.provider_probes.resolve_key", return_value=key):
        with patch("app.services.provider_probes.active_provider", return_value="hive"):
            with patch("app.services.provider_probes.generate",
                       side_effect=ServiceSecurityError("CORE_POLICY_DENIED")):
                with pytest.raises(ServiceSecurityError, match="CORE_POLICY_DENIED"):
                    probe_key(key.secret, key.key_id, fake_policy())


@pytest.mark.parametrize("purpose", ["KEY_PROBE", "ADMIN_PROMPT"])
def test_should_allow_administrative_checkpoint_without_chat_operation(purpose: Purpose) -> None:
    context = GenerationPolicy("request-id", None, True, time.time() + 120)
    with patch("app.core.rag.generation_policy.call_core") as core:
        assert 0 < context.checkpoint(purpose) <= 30
    core.assert_not_called()


def test_should_reject_chat_without_operation_before_core_call() -> None:
    context = GenerationPolicy("request-id", None, True, time.time() + 120)
    with patch("app.core.rag.generation_policy.call_core") as core:
        with pytest.raises(GenerationPolicyError, match="OPERATION_POLICY_REQUIRED"):
            context.checkpoint("CHAT")
    core.assert_not_called()


@pytest.mark.parametrize("phase", ["START", "END"])
def test_should_update_local_telemetry_only_after_durable_end_acknowledgement(phase: str) -> None:
    context = GenerationPolicy("request-id", "operation-id", True, time.time() + 120)
    event = {"attemptId": "attempt-id", "phase": phase}
    tracker = Mock()
    with patch("app.core.rag.generation_policy.call_core") as core:
        with patch("app.services.ai_telemetry.telemetry_tracker", tracker):
            context.record(event)
    assert core.call_args.args[-1] == "attempt-id:" + phase
    assert tracker.record_event.call_count == int(phase == "END")


def test_should_leave_telemetry_unknown_when_durable_end_acknowledgement_fails() -> None:
    context = GenerationPolicy("request-id", "operation-id", True, time.time() + 120)
    with patch("app.core.rag.generation_policy.call_core",
               side_effect=ServiceSecurityError("CORE_POLICY_UNAVAILABLE")):
        with patch("app.services.ai_telemetry.telemetry_tracker.record_event") as telemetry:
            with pytest.raises(ServiceSecurityError):
                context.record({"attemptId": "attempt-id", "phase": "END"})
    telemetry.assert_not_called()
