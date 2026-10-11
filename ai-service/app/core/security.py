"""Fail-closed service identity verification for private AI endpoints."""

import hashlib
import json
import time
from typing import Annotated, Any

from fastapi import Depends, HTTPException, Request
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from starlette.concurrency import run_in_threadpool

from app.core.private_core import call_core
from app.core.service_security import ServiceSecurityError, verify_core_token

security = HTTPBearer(auto_error=False)


def _check_binding(claims: dict[str, Any], request: Request, body: bytes) -> None:
    expected = {
        "method": request.method.upper(),
        "path": request.url.path,
        "query": request.url.query,
        "bodyHash": hashlib.sha256(body).hexdigest(),
        "requestId": request.headers.get("X-Request-ID", ""),
        "idempotencyKey": request.headers.get("Idempotency-Key", ""),
    }
    if not expected["requestId"] or any(
        claims.get(key) != value for key, value in expected.items()
    ):
        raise ServiceSecurityError("REQUEST_BINDING_INVALID")
    if body and "application/json" in request.headers.get("content-type", ""):
        payload = json.loads(body)
        if (
            isinstance(payload, dict)
            and payload.get("requestId", expected["requestId"]) != expected["requestId"]
        ):
            raise ServiceSecurityError("REQUEST_ID_INVALID")


async def verify_service_jwt(
    request: Request,
    credentials: Annotated[HTTPAuthorizationCredentials | None, Depends(security)],
) -> dict[str, Any]:
    """Verify signature, exact request binding and durable Core nonce consumption."""
    if credentials is None or credentials.scheme.lower() != "bearer":
        raise HTTPException(status_code=401, detail="SERVICE_AUTH_REQUIRED")
    body = await request.body()
    try:
        claims = verify_core_token(credentials.credentials, now=time.time())
        _check_binding(claims, request, body)
        await run_in_threadpool(
            call_core,
            "/internal/v1/service-nonces/consume",
            {
                "nonce": claims["jti"],
                "expiresAt": claims["exp"],
                "requestId": claims["requestId"],
            },
            claims["requestId"],
            claims["jti"],
        )
        return claims
    except (ServiceSecurityError, ValueError, TypeError, OSError) as error:
        raise HTTPException(status_code=401, detail="SERVICE_AUTH_INVALID") from error
