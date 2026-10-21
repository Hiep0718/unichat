"""Provider settings, environment precedence, ownership and redaction regressions."""

from pathlib import Path
from typing import Any, Literal

import pytest
from pydantic import ValidationError

from app.core.provider_settings import HIVE_BASE_URL, HIVE_MODEL, ProviderSettings
from app.core.rag.key_registry import (
    active_provider,
    configured_keys,
    configured_model,
    resolve_key,
)
from app.core.settings import Settings


def test_should_default_to_legacy_gemini_without_requiring_hive_credentials() -> None:
    assert ProviderSettings().llm_provider == "gemini"
    assert active_provider() == "gemini"
    assert configured_model() == "gemini-3.5-flash"
    assert configured_keys() == []
    assert resolve_key("unknown") is None


def test_should_default_to_official_hive_endpoint_and_approved_model(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.delenv("HIVE_BASE_URL", raising=False)
    monkeypatch.delenv("HIVE_MODEL", raising=False)
    configuration = ProviderSettings(_env_file=None)
    assert configuration.hive_base_url == HIVE_BASE_URL
    assert configuration.hive_model == HIVE_MODEL
    assert HIVE_BASE_URL == "https://api-cdn.thehive.ai/api/v3"
    assert HIVE_MODEL == "deepseek-ai/deepseek-v4.1-flash-1017"


@pytest.mark.parametrize("endpoint", ["https://api.thehive.ai/api/v3",
    "https://api-cdn.thehive.ai/api/v3/", "https://api-va1.thehive.ai/api/v3"])
def test_should_accept_only_approved_hive_endpoints(endpoint: str) -> None:
    assert ProviderSettings(hive_base_url=endpoint).hive_base_url == endpoint


@pytest.mark.parametrize("overrides", [
    {"hive_base_url": "http://api.thehive.ai/api/v3"},
    {"hive_base_url": "https://user@api.thehive.ai/api/v3"},
    {"hive_base_url": "https://api.thehive.ai:443/api/v3"},
    {"hive_base_url": "https://api.thehive.ai/api/v3?secret=x"},
    {"hive_base_url": "https://api.thehive.ai/api/v3#fragment"},
    {"hive_base_url": "https://evil.invalid/api/v3"}, {"hive_model": "unsupported"},
    {"hive_reasoning_effort": "medium"}, {"hive_max_tokens": 4097},
    {"hive_temperature": 3}, {"hive_top_p": -1}, {"HIVE_READ_IDLE_TIMEOUT_SECONDS": 6},
    {"llm_provider": "hive"}, {"llm_provider": "unknown"},
])
def test_should_reject_invalid_configuration_without_revealing_credentials(
    overrides: dict[str, Any],
) -> None:
    with pytest.raises(ValidationError) as failure:
        ProviderSettings(**overrides)
    assert "input_value" not in str(failure.value)


@pytest.mark.parametrize("effort", ["none", "low", "high", "max"])
def test_should_accept_approved_reasoning_efforts(
    effort: Literal["none", "low", "high", "max"],
) -> None:
    assert ProviderSettings(hive_reasoning_effort=effort).hive_reasoning_effort == effort


def test_should_preserve_file_precedence_and_environment_override(
    monkeypatch: pytest.MonkeyPatch, tmp_path: Path,
) -> None:
    root_env, service_env = tmp_path / "root.env", tmp_path / "service.env"
    root_env.write_text("LLM_PROVIDER=hive\nHIVE_API_KEY=root-fixture\n", encoding="utf-8")
    service_env.write_text("HIVE_API_KEY=service-fixture\n", encoding="utf-8")
    for settings_type in (ProviderSettings, Settings):
        assert settings_type(_env_file=(root_env, service_env)).hive_api_key == "service-fixture"
        monkeypatch.setenv("HIVE_API_KEY", "environment-fixture")
        configuration = settings_type(_env_file=(root_env, service_env))
        assert configuration.hive_api_key == "environment-fixture"
        assert "environment-fixture" not in repr(configuration)
        monkeypatch.delenv("HIVE_API_KEY")
    monkeypatch.setenv("HIVE_API_KEY", "")
    with pytest.raises(ValidationError, match="HIVE_CREDENTIALS_REQUIRED"):
        ProviderSettings(_env_file=(root_env, service_env))


def test_should_resolve_stable_provider_owned_deduplicated_keys(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setenv("LLM_PROVIDER", "hive")
    monkeypatch.setenv("HIVE_API_KEY", " fixture-primary ")
    monkeypatch.setenv("HIVE_API_KEY_SECONDARY", "fixture-secondary")
    monkeypatch.setenv("HIVE_API_KEYS", "fixture-primary, fixture-list, fixture-list")
    monkeypatch.setenv("GEMINI_API_KEY", "gemini-fixture")
    keys = configured_keys()
    assert [key.key_id for key in keys[:2]] == ["hive-primary", "hive-secondary"]
    assert len(keys) == 4 and len(keys[2].key_id) == len("hive-list-") + 12
    assert keys[2].provider == "hive" and keys[3].provider == "gemini"
    assert keys[2].key_id == configured_keys()[2].key_id
    assert "fixture-primary" not in repr(keys)
    assert configured_model() == HIVE_MODEL
    assert resolve_key(keys[2].key_id) == keys[2]


def test_should_prioritize_canonical_idle_timeout_alias(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("HIVE_READ_TIMEOUT_SECONDS", "3")
    assert ProviderSettings().hive_read_idle_timeout_seconds == 3
    monkeypatch.setenv("HIVE_READ_IDLE_TIMEOUT_SECONDS", "2")
    assert ProviderSettings().hive_read_idle_timeout_seconds == 2
