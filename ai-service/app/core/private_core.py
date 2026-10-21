"""Authenticated private Core adapter; no local authorization decisions."""

import json
import os
from typing import Any

import httpx

from app.core.service_security import ServiceSecurityError, sign_core_request


def call_core(path: str, payload: dict[str, Any], request_id: str, key: str = "") -> dict[str, Any]:
    """Send one signed request; ambiguous transport failures never allow generation."""
    base_url = os.getenv("CORE_API_BASE_URL", "").rstrip("/")
    if not base_url or (
        os.getenv("APP_ENV") == "production" and not base_url.startswith("https://")
    ):
        raise ServiceSecurityError("CORE_POLICY_UNCONFIGURED")
    body = json.dumps(payload, ensure_ascii=False, separators=(",", ":")).encode("utf-8")
    headers = {
        "Authorization": f"Bearer {sign_core_request(path, body, request_id, key)}",
        "Content-Type": "application/json",
        "X-Request-ID": request_id,
        "Idempotency-Key": key,
    }
    try:
        with httpx.Client(timeout=5.0, follow_redirects=False) as client:
            response = client.post(base_url + path, content=body, headers=headers)
            if response.status_code == 503 and _maintenance_rejection(response):
                raise ServiceSecurityError("AI_MAINTENANCE")
            response.raise_for_status()
            if response.status_code == 204 or not response.content:
                return {}
            result = response.json()
            if not isinstance(result, dict):
                raise ServiceSecurityError("CORE_RESPONSE_INVALID")
            return result
    except (httpx.HTTPError, ValueError) as error:
        raise ServiceSecurityError("CORE_POLICY_UNAVAILABLE") from error


def _maintenance_rejection(response: httpx.Response) -> bool:
    try:
        payload = response.json()
    except ValueError:
        return False
    return isinstance(payload, dict) and payload.get("code") == "AI_MAINTENANCE"
