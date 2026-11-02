"""Redacted provider failure diagnostics."""

import pytest
from google.genai.errors import APIError

from app.core.rag.provider_gateway import _safe_api_reason


@pytest.mark.parametrize(("message", "expected"), [
    ("API key expired: sensitive-key", "API_KEY"),
    ("The response schema has too many states", "SCHEMA"),
    ("Billing is unavailable", "BILLING_OR_QUOTA"),
    ("Unexpected private text", "INVALID_REQUEST"),
])
def test_should_return_only_whitelisted_failure_category(message: str, expected: str) -> None:
    error = APIError(400, {"error": {"message": message, "status": "INVALID_ARGUMENT"}})

    assert _safe_api_reason(error) == expected
