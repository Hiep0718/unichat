"""Stable provider-bound credentials and explicit active model selection."""

import hashlib
from dataclasses import dataclass, field

from app.core.provider_settings import ProviderSettings


@dataclass(frozen=True)
class ProviderKey:
    """Credential identity; secret is excluded from repr, diagnostics and attempts."""

    key_id: str
    name: str
    secret: str = field(repr=False)
    provider: str = "gemini"


def _provider_keys(config: ProviderSettings, provider: str) -> list[ProviderKey]:
    primary = str(getattr(config, f"{provider}_api_key"))
    secondary = str(getattr(config, f"{provider}_api_key_2")) or str(
        getattr(config, f"{provider}_api_key_secondary")
    )
    entries = [
        (f"{provider}-primary", f"{provider.upper()}_API_KEY", primary),
        (f"{provider}-secondary", f"{provider.upper()}_API_KEY_2", secondary),
    ]
    entries.extend(
        (
            f"{provider}-list-{hashlib.sha256(value.strip().encode()).hexdigest()[:12]}",
            f"{provider.upper()}_API_KEYS",
            value,
        )
        for value in str(getattr(config, f"{provider}_api_keys")).split(",")
    )
    keys: list[ProviderKey] = []
    seen: set[str] = set()
    for key_id, name, raw in entries:
        secret = raw.strip()
        if secret and secret not in seen:
            keys.append(ProviderKey(key_id, name, secret, provider))
            seen.add(secret)
    return keys


def configured_keys() -> list[ProviderKey]:
    """List all configured providers without making any network request."""
    config = ProviderSettings()
    return _provider_keys(config, "hive") + _provider_keys(config, "gemini")


def active_provider() -> str:
    """Return the environment-selected provider; legacy unset selection is Gemini."""
    return ProviderSettings().llm_provider


def configured_model(provider: str | None = None) -> str:
    """Return the approved model for a specific or active provider."""
    config = ProviderSettings()
    selected = provider or config.llm_provider
    return config.hive_model if selected == "hive" else config.gemini_model


def resolve_key(key_id: str) -> ProviderKey | None:
    """Resolve exactly the selected stable ID; unknown IDs never select another key."""
    return next((key for key in configured_keys() if key.key_id == key_id), None)
