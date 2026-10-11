"""RS256 identities and request integrity shared by AI private clients."""

import hashlib
import os
import time
import uuid
from collections.abc import Callable
from pathlib import Path
from typing import Any, cast

from google.auth import crypt, jwt


class ServiceSecurityError(RuntimeError):
    """Expose only a safe machine-readable service security failure code."""


def configured_key(name: str) -> str:
    """Read a PEM key from environment or an explicitly configured file."""
    value = os.getenv(name, "").replace("\\n", "\n")
    if value:
        return value
    path = os.getenv(f"{name}_PATH", "")
    if path:
        return Path(path).read_text(encoding="utf-8")
    raise ServiceSecurityError("SERVICE_KEY_UNCONFIGURED")


def verify_core_token(token: str, now: float) -> dict[str, Any]:
    """Validate a Core JWT without unsigned, static or local bypass credentials."""
    key_id = os.getenv("CORE_SERVICE_KEY_ID", "core-service-v1")
    try:
        decode_header = cast(Callable[[str], dict[str, Any]], jwt.decode_header)
        decode_claims = cast(Callable[..., dict[str, Any]], jwt.decode)
        header = decode_header(token)
        if header.get("alg") != "RS256" or header.get("kid") != key_id:
            raise ServiceSecurityError("SERVICE_HEADER_INVALID")
        claims = decode_claims(
            token,
            certs={key_id: configured_key("CORE_SERVICE_PUBLIC_KEY")},
            audience="unichat-ai",
            clock_skew_in_seconds=0,
        )
        _validate_identity(claims, now)
        return claims
    except (ValueError, TypeError, KeyError) as error:
        raise ServiceSecurityError("SERVICE_SIGNATURE_INVALID") from error


def _validate_identity(claims: dict[str, Any], now: float) -> None:
    expected = {"iss": "unichat-core", "sub": "core-api", "purpose": "ai-request"}
    if any(claims.get(key) != value for key, value in expected.items()):
        raise ServiceSecurityError("SERVICE_IDENTITY_INVALID")
    issued, expiry = claims.get("iat"), claims.get("exp")
    if type(issued) is not int or type(expiry) is not int:
        raise ServiceSecurityError("SERVICE_TIME_INVALID")
    if issued > now or expiry <= now or expiry <= issued or expiry - issued > 60:
        raise ServiceSecurityError("SERVICE_TIME_INVALID")
    if not isinstance(claims.get("jti"), str) or not claims["jti"]:
        raise ServiceSecurityError("SERVICE_NONCE_INVALID")


def sign_core_request(path: str, body: bytes, request_id: str, key: str = "") -> str:
    """Sign the exact outbound bytes using the AI-only private service key."""
    key_id = os.getenv("AI_SERVICE_KEY_ID", "ai-service-v1")
    issued = int(time.time())
    claims = {
        "iss": "unichat-ai",
        "aud": "unichat-core",
        "sub": "ai-service",
        "purpose": "private-core",
        "iat": issued,
        "exp": issued + 60,
        "jti": str(uuid.uuid4()),
        "method": "POST",
        "path": path,
        "query": "",
        "bodyHash": hashlib.sha256(body).hexdigest(),
        "requestId": request_id,
        "idempotencyKey": key,
    }
    create_signer = cast(Callable[..., crypt.RSASigner], crypt.RSASigner.from_string)
    encode_token = cast(Callable[..., bytes], jwt.encode)
    signer = create_signer(configured_key("AI_SERVICE_PRIVATE_KEY"), key_id=key_id)
    return encode_token(signer, claims, key_id=key_id).decode("ascii")
