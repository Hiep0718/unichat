"""Pure provider target ordering independent from transport and attempt accounting."""

import os
from dataclasses import dataclass, field
from typing import Literal

from pydantic import ValidationError

from app.core.rag.generation_policy import Purpose
from app.core.rag.key_registry import (
    ProviderKey,
    active_provider,
    configured_keys,
    configured_model,
    fallback_provider,
    provider_role,
)
from app.core.rag.provider_contracts import ProviderFailure, ProviderResult

RouteRole = Literal["PRIMARY", "FALLBACK", "LEGACY"]
FAILOVER_PURPOSES = frozenset({"CHAT", "COMPACTION", "WORKSPACE_SUMMARY"})


@dataclass(frozen=True)
class ProviderTarget:
    """One provider, credential and model selected for a physical attempt."""

    provider: str
    model: str
    key: ProviderKey | None
    role: RouteRole

    @property
    def key_id(self) -> str:
        """Return the durable credential identity for attempt accounting."""
        return self.key.key_id if self.key else "ollama-local"


@dataclass
class GenerationRouteState:
    """Request-local route cursor shared across output-validation retries."""

    targets: tuple[ProviderTarget, ...] = field(default_factory=tuple)
    target_index: int = 0
    pinned_target: ProviderTarget | None = None

    def initialize(self, targets: tuple[ProviderTarget, ...]) -> None:
        """Initialize once and reject a changed route within the same request."""
        if not self.targets:
            self.targets = targets
            return
        if self.targets != targets:
            raise ProviderFailure("PROVIDER_ROUTE_CHANGED")

    def current_target(self) -> ProviderTarget:
        """Return the pinned target or current untried route target."""
        if self.pinned_target is not None:
            return self.pinned_target
        return self.targets[self.target_index]

    def can_advance(self, purpose: Purpose, error: ProviderFailure) -> bool:
        """Allow bounded target advancement only before a target is pinned."""
        return (
            self.pinned_target is None
            and purpose in FAILOVER_PURPOSES
            and error.transient
            and self.target_index + 1 < len(self.targets)
        )

    def advance(self) -> None:
        """Move to the next bounded target."""
        self.target_index += 1

    def pin(self, target: ProviderTarget, result: ProviderResult) -> None:
        """Pin the successful target so validation retries cannot switch providers."""
        if (target.provider, target.model, target.key_id) != (
            result.provider, result.model, result.key_id
        ):
            raise ProviderFailure("PROVIDER_ATTRIBUTION_INVALID")
        self.pinned_target = target


def build_provider_route(
    purpose: Purpose,
    selected_key: ProviderKey | None = None,
    model: str | None = None,
) -> tuple[ProviderTarget, ...]:
    """Build an exact diagnostic target or a bounded automatic provider route."""
    try:
        if selected_key is not None:
            return (_selected_target(selected_key, model),)
        if purpose in {"ADMIN_PROMPT", "KEY_PROBE"}:
            raise ProviderFailure("PROVIDER_SELECTION_REQUIRED")
        return _automatic_targets(purpose, model)
    except ValidationError as error:
        raise ProviderFailure("PROVIDER_UNCONFIGURED") from error


def _selected_target(selected_key: ProviderKey, model: str | None) -> ProviderTarget:
    keys = configured_keys()
    if selected_key not in keys:
        raise ProviderFailure("PROVIDER_KEY_UNKNOWN")
    role = provider_role(selected_key.provider)
    target_model = model or configured_model(selected_key.provider)
    if role is None or target_model != configured_model(selected_key.provider):
        raise ProviderFailure("PROVIDER_SELECTION_INVALID")
    return ProviderTarget(selected_key.provider, target_model, selected_key, role)


def _automatic_targets(purpose: Purpose, model: str | None) -> tuple[ProviderTarget, ...]:
    primary = "gemini" if purpose == "QUERY_PLAN" else active_provider()
    primary_model = configured_model(primary)
    if model is not None and model != primary_model:
        raise ProviderFailure("PROVIDER_SELECTION_INVALID")
    limit = 2 if purpose in FAILOVER_PURPOSES and primary == "gemini" else 1
    targets = _provider_targets(primary, primary_model, "PRIMARY", limit)
    if purpose in FAILOVER_PURPOSES:
        targets += _fallback_targets(primary)
    if not targets:
        raise ProviderFailure("PROVIDER_UNCONFIGURED")
    return tuple(targets)


def _fallback_targets(primary: str) -> list[ProviderTarget]:
    fallback = fallback_provider()
    if fallback:
        return _provider_targets(fallback, configured_model(fallback), "FALLBACK", 1)
    if primary == "gemini" and os.getenv("ENABLE_OLLAMA_FALLBACK", "false").lower() == "true":
        return [ProviderTarget("ollama", os.getenv("OLLAMA_MODEL", "llama3"), None, "LEGACY")]
    return []


def _provider_targets(
    provider: str, model: str, role: RouteRole, limit: int
) -> list[ProviderTarget]:
    keys = [key for key in configured_keys() if key.provider == provider]
    return [ProviderTarget(provider, model, key, role) for key in keys[:limit]]
