"""Stable Gemini key identities shared by chat, probes, prompts and telemetry."""

import hashlib
import os
from dataclasses import dataclass, field


@dataclass(frozen=True)
class ProviderKey:
    """A configured key whose raw value never appears in repr or telemetry."""

    key_id: str
    name: str
    secret: str = field(repr=False)


def configured_keys() -> list[ProviderKey]:
    """Resolve environment aliases once with deterministic, non-positional IDs."""
    definitions = [
        ("gemini-primary", "GEMINI_API_KEY", os.getenv("GEMINI_API_KEY", "")),
        (
            "gemini-secondary",
            "GEMINI_API_KEY_2",
            os.getenv("GEMINI_API_KEY_2", "") or os.getenv("GEMINI_API_KEY_SECONDARY", ""),
        ),
    ]
    definitions.extend(
        (
            f"gemini-list-{hashlib.sha256(value.strip().encode()).hexdigest()[:12]}",
            "GEMINI_API_KEYS",
            value,
        )
        for value in os.getenv("GEMINI_API_KEYS", "").split(",")
    )
    keys: list[ProviderKey] = []
    seen: set[str] = set()
    for key_id, name, raw in definitions:
        secret = raw.strip()
        if secret and secret not in seen:
            keys.append(ProviderKey(key_id, name, secret))
            seen.add(secret)
    return keys


def resolve_key(key_id: str) -> ProviderKey | None:
    """Resolve the actual selected key; unknown IDs never fall back to primary."""
    return next((key for key in configured_keys() if key.key_id == key_id), None)


def configured_model() -> str:
    """Return one configured model; unsupported names never trigger model guessing."""
    return os.getenv("GEMINI_MODEL", "gemini-3.5-flash")
