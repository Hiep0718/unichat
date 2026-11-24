from typing import Any
"""Offline Gemini adapter contracts for provider-specific output budgets."""

from types import SimpleNamespace
from unittest.mock import Mock, patch

import pytest
from google.genai import types

from app.core.rag.gemini_provider import _gemini, _gemini_configuration, _provider_schema
from app.core.rag.key_registry import ProviderKey
from app.tests.test_llm_provider_fallback import fake_policy


def test_should_cap_structured_query_plan_generation() -> None:
    client = Mock()
    client.__enter__ = Mock(return_value=client)
    client.__exit__ = Mock(return_value=False)
    client.models.generate_content.return_value = SimpleNamespace(
        text='{"facets":[]}', usage_metadata=None
    )
    key = ProviderKey("gemini-fixture", "GEMINI_API_KEY", "fixture-secret", "gemini")

    with patch("app.core.rag.gemini_provider.genai.Client", return_value=client):
        with patch("app.core.rag.gemini_provider.types.GenerateContentConfig") as configuration:
            _gemini("question-only prompt", key, "fixture-model", 12, None, {}, fake_policy(),
                    "QUERY_PLAN")

    assert configuration.call_args.kwargs["max_output_tokens"] == 512
    assert configuration.return_value.response_mime_type == "application/json"
    client.models.generate_content.assert_called_once()


def test_should_reduce_provider_schema_complexity_without_mutating_application_schema() -> None:
    original: dict[str, Any] = {"properties": {"maxItems": {"type": "array", "maxItems": 100,
                "items": {"type": "string", "minLength": 1}}}, "required": ["maxItems"]}

    simplified = _provider_schema(original)

    assert simplified == {"properties": {"maxItems": {"type": "array",
                          "items": {"type": "string"}}}, "required": ["maxItems"]}
    assert original["properties"]["maxItems"]["maxItems"] == 100


def test_should_bound_gemini_3_thinking_level_by_purpose(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.delenv("GEMINI_THINKING_LEVEL", raising=False)

    plan_cfg = _gemini_configuration("QUERY_PLAN", {}, "gemini-3.5-flash")
    chat_cfg = _gemini_configuration("CHAT", {}, "gemini-3.5-flash")
    legacy_cfg = _gemini_configuration("CHAT", {}, "gemini-2.5-flash")

    assert plan_cfg.thinking_config == types.ThinkingConfig(
        thinking_level=types.ThinkingLevel.MINIMAL
    )
    assert chat_cfg.thinking_config == types.ThinkingConfig(
        thinking_level=types.ThinkingLevel.LOW
    )
    assert legacy_cfg.thinking_config is None
