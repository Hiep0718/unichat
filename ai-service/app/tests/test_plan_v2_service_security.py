"""Real RSA verification tests with an offline durable nonce adapter."""

import hashlib
import json
import time
from collections.abc import Callable
from typing import Any, cast
from unittest.mock import patch

import pytest
from cryptography.hazmat.primitives import serialization
from cryptography.hazmat.primitives.asymmetric import rsa
from fastapi import Depends, FastAPI
from fastapi.testclient import TestClient
from google.auth import crypt, jwt

from app.core.security import verify_service_jwt
from app.core.service_security import ServiceSecurityError, sign_core_request, verify_core_token


@pytest.fixture
def keys(monkeypatch: pytest.MonkeyPatch) -> tuple[str, str]:
    private = rsa.generate_private_key(public_exponent=65537, key_size=2048)
    private_pem = private.private_bytes(serialization.Encoding.PEM,
                                      serialization.PrivateFormat.PKCS8,
                                      serialization.NoEncryption()).decode()
    public_pem = private.public_key().public_bytes(serialization.Encoding.PEM,
                                                  serialization.PublicFormat.SubjectPublicKeyInfo).decode()
    monkeypatch.setenv("CORE_SERVICE_PUBLIC_KEY", public_pem)
    monkeypatch.setenv("AI_SERVICE_PRIVATE_KEY", private_pem)
    monkeypatch.setenv("CORE_API_BASE_URL", "http://core.invalid")
    return private_pem, public_pem


def token(private: str, body: bytes = b"{}", **overrides: Any) -> str:
    now = int(time.time())
    claims = {"iss": "unichat-core", "aud": "unichat-ai", "sub": "core-api",
              "purpose": "ai-request", "iat": now, "exp": now + 60, "jti": "nonce-1",
              "method": "POST", "path": "/internal/v1/test", "query": "",
              "bodyHash": hashlib.sha256(body).hexdigest(), "requestId": "req-1",
              "idempotencyKey": "key-1", **overrides}
    create_signer = cast(Callable[..., crypt.RSASigner], crypt.RSASigner.from_string)
    encode_token = cast(Callable[..., bytes], jwt.encode)
    signer = create_signer(private, key_id="core-service-v1")
    return encode_token(signer, claims).decode()


def client() -> TestClient:
    app = FastAPI()

    @app.post("/internal/v1/test", dependencies=[Depends(verify_service_jwt)])
    def endpoint() -> dict[str, bool]:
        return {"ok": True}

    return TestClient(app)


@pytest.mark.parametrize("headers", [{}, {"Authorization": "Bearer eyFake"},
                                     {"Authorization": "Bearer unichat-internal-service-key-dev"}])
def test_should_reject_local_and_prefix_bypass(headers: dict[str, str], monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("APP_ENV", "local")
    assert client().post("/internal/v1/test", headers=headers, json={}).status_code == 401


@pytest.mark.parametrize("overrides", [{"aud": "wrong"}, {"iss": "wrong"}, {"sub": "user"},
                                       {"purpose": "other"}, {"exp": int(time.time()) - 1},
                                       {"exp": int(time.time()) + 300}, {"jti": ""}])
def test_should_reject_wrong_identity_time_and_nonce(keys: tuple[str, str], overrides: dict[str, Any]) -> None:
    with pytest.raises(ServiceSecurityError):
        verify_core_token(token(keys[0], **overrides), time.time())


def test_should_validate_exact_bytes_and_reject_replay(keys: tuple[str, str]) -> None:
    body = json.dumps({"requestId": "req-1"}, ensure_ascii=False).encode()
    headers = {"Authorization": f"Bearer {token(keys[0], body)}", "X-Request-ID": "req-1",
               "Idempotency-Key": "key-1", "Content-Type": "application/json"}
    with patch("app.core.security.call_core", side_effect=[{}, ServiceSecurityError("NONCE_USED")]) as core:
        assert client().post("/internal/v1/test", headers=headers, content=body).status_code == 200
        assert core.call_args.args[1]["nonce"] == "nonce-1"
        assert client().post("/internal/v1/test", headers=headers, content=body).status_code == 401


@pytest.mark.parametrize("tamper", ["body", "path", "query", "requestId", "key"])
def test_should_reject_request_tampering_before_nonce(keys: tuple[str, str], tamper: str) -> None:
    overrides: dict[str, Any] = {"path": "/wrong"} if tamper == "path" else {"query": "wrong"} if tamper == "query" else {}
    headers = {"Authorization": f"Bearer {token(keys[0], **overrides)}",
               "X-Request-ID": "bad" if tamper == "requestId" else "req-1",
               "Idempotency-Key": "bad" if tamper == "key" else "key-1",
               "Content-Type": "application/json"}
    with patch("app.core.security.call_core") as core:
        response = client().post("/internal/v1/test", headers=headers,
                                 content=b'{ "x": 1 }' if tamper == "body" else b"{}")
        assert response.status_code == 401
        core.assert_not_called()


def test_should_sign_reverse_identity_bound_to_exact_body(keys: tuple[str, str]) -> None:
    body = "đúng bytes".encode()
    encoded = sign_core_request("/internal/v1/provider-attempts", body, "req-x", "attempt-1:START")
    decode_token = cast(Callable[..., dict[str, Any]], jwt.decode)
    result = decode_token(encoded, certs={"ai-service-v1": keys[1]}, audience="unichat-core")
    assert result["sub"] == "ai-service"
    assert result["iss"] == "unichat-ai"
    assert result["bodyHash"] == hashlib.sha256(body).hexdigest()
    assert result["exp"] - result["iat"] == 60
