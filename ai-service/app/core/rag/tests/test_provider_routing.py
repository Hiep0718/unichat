"""Bounded provider routing remains deterministic and purpose-aware."""

import pytest

from app.core.provider_settings import HIVE_MODEL
from app.core.rag.generation_policy import Purpose
from app.core.rag.key_registry import configured_keys
from app.core.rag.provider_contracts import ProviderFailure, ProviderResult
from app.core.rag.provider_routing import GenerationRouteState, build_provider_route


@pytest.fixture
def fallback_route(monkeypatch: pytest.MonkeyPatch) -> None:
    """Configure two Gemini keys and one Hive fallback without external calls."""
    monkeypatch.setenv("LLM_PROVIDER", "gemini")
    monkeypatch.setenv("LLM_FALLBACK_PROVIDER", "hive")
    monkeypatch.setenv("ENABLE_PROVIDER_FALLBACK", "true")
    monkeypatch.setenv("GEMINI_API_KEY", "gemini-primary-fixture")
    monkeypatch.setenv("GEMINI_API_KEY_2", "gemini-secondary-fixture")
    monkeypatch.setenv("HIVE_API_KEY", "hive-primary-fixture")


def test_should_route_chat_through_two_gemini_keys_then_hive(
    fallback_route: None,
) -> None:
    route = build_provider_route("CHAT")

    assert [(target.provider, target.key_id, target.role) for target in route] == [
        ("gemini", "gemini-primary", "PRIMARY"),
        ("gemini", "gemini-secondary", "PRIMARY"),
        ("hive", "hive-primary", "FALLBACK"),
    ]
    assert route[-1].model == HIVE_MODEL


def test_should_keep_query_planner_on_one_primary_gemini_target(
    fallback_route: None,
) -> None:
    route = build_provider_route("QUERY_PLAN")

    assert len(route) == 1
    assert route[0].key_id == "gemini-primary"


def test_should_keep_query_planner_on_gemini_during_manual_hive_mode(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setenv("LLM_PROVIDER", "hive")
    monkeypatch.setenv("HIVE_API_KEY", "hive-primary-fixture")
    monkeypatch.setenv("GEMINI_API_KEY", "gemini-primary-fixture")

    route = build_provider_route("QUERY_PLAN")

    assert [(target.provider, target.key_id) for target in route] == [
        ("gemini", "gemini-primary")
    ]


def test_should_allow_exact_selected_fallback_diagnostic(
    fallback_route: None,
) -> None:
    selected = next(key for key in configured_keys() if key.key_id == "hive-primary")
    route = build_provider_route("KEY_PROBE", selected, HIVE_MODEL)

    assert len(route) == 1
    assert route[0].provider == "hive"
    assert route[0].role == "FALLBACK"


@pytest.mark.parametrize("purpose", ["ADMIN_PROMPT", "KEY_PROBE"])
def test_should_require_exact_target_for_admin_purposes(
    fallback_route: None, purpose: Purpose,
) -> None:
    with pytest.raises(ProviderFailure, match="PROVIDER_SELECTION_REQUIRED"):
        build_provider_route(purpose)


def test_should_pin_successful_target_for_validation_retry(
    fallback_route: None,
) -> None:
    state = GenerationRouteState()
    route = build_provider_route("CHAT")
    state.initialize(route)
    state.advance()
    state.advance()
    target = state.current_target()

    state.pin(target, ProviderResult("answer", "hive", HIVE_MODEL, "hive-primary"))

    assert state.current_target() == target
    assert state.can_advance("CHAT", ProviderFailure("PROVIDER_TIMEOUT", True)) is False


def test_should_reject_attribution_that_does_not_match_selected_target(
    fallback_route: None,
) -> None:
    target = build_provider_route("CHAT")[0]
    state = GenerationRouteState(targets=(target,))

    with pytest.raises(ProviderFailure, match="PROVIDER_ATTRIBUTION_INVALID"):
        state.pin(target, ProviderResult("answer", "hive", HIVE_MODEL, "hive-primary"))
