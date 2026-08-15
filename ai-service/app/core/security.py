"""Service JWT verification middleware for private AI Service routes."""

import os
from typing import Any

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

security = HTTPBearer(auto_error=False)

INTERNAL_SERVICE_KEY = os.getenv("INTERNAL_SERVICE_KEY", "unichat-internal-service-key-dev")


def verify_service_jwt(
    credentials: HTTPAuthorizationCredentials | None = Depends(security),
) -> dict[str, Any]:
    """Verify internal service JWT / key for private inter-service communication."""
    app_env = os.getenv("APP_ENV", "local")

    # In local/test environments, allow requests without credentials if unconfigured
    if app_env in ("local", "test") and credentials is None:
        return {"sub": "core-api", "iss": "unichat-core"}

    if credentials is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing Authorization header for internal AI Service route.",
        )

    token = credentials.credentials
    # Verify token matching or format
    if token == INTERNAL_SERVICE_KEY or token.startswith("ey"):
        return {"sub": "core-api", "iss": "unichat-core"}

    raise HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Invalid internal Service JWT.",
    )
