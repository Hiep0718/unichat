"""Small provider port and safe lifecycle errors independent of transport adapters."""

from collections.abc import Callable
from dataclasses import dataclass
from typing import Any, Protocol

from app.core.service_security import ServiceSecurityError

Observer = Callable[[str, dict[str, Any]], None]
Cancellation = Callable[[], bool]
MAX_OUTPUT_CHARACTERS = 80000
SAFE_POLICY_CODES = frozenset({
    "AI_MAINTENANCE", "CORE_POLICY_DENIED", "CORE_POLICY_UNAVAILABLE", "CORE_POLICY_INVALID",
    "CLOUD_POLICY_DENIED", "DEADLINE_EXCEEDED", "GENERATION_CANCELLED",
})


def operational_failure_code(error: Exception) -> str:
    """Expose only typed operational codes, never raw provider or Core bodies."""
    if isinstance(error, ProviderFailure):
        return error.code
    if isinstance(error, ServiceSecurityError) and str(error) in SAFE_POLICY_CODES:
        return str(error)
    return "RETRIEVAL_UNAVAILABLE"


class ProviderFailure(RuntimeError):
    """Content-free operational failure; only explicit Gemini transient failures retry."""

    def __init__(self, code: str, transient: bool = False) -> None:
        super().__init__(code)
        self.code = code
        self.transient = transient


class GenerationCancelled(RuntimeError):
    """Private cancellation, distinct from a provider outage or domain refusal."""


def check_cancelled(cancelled: Cancellation | None) -> None:
    """Stop before any further generation work after private delivery closes."""
    if cancelled is not None and cancelled():
        raise GenerationCancelled("GENERATION_CANCELLED")


@dataclass(frozen=True)
class ProviderResult:
    """Actual attribution and measured usage; missing measurements stay unknown."""

    text: str
    provider: str
    model: str
    key_id: str
    input_tokens: int | None = None
    output_tokens: int | None = None


class ProviderAdapter(Protocol):
    """Focused generation port; authorization and durable attempts remain in gateway."""

    def __call__(self, prompt: str, model: str, timeout: float) -> ProviderResult:
        """Generate one response within the supplied attempt budget."""
        ...
