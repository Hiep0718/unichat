"""Global FastAPI exception handlers."""

from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse

from app.shared.errors import AppError


def register_exception_handlers(application: FastAPI) -> None:
    """Register handlers that keep internal details out of responses."""

    @application.exception_handler(AppError)
    async def handle_app_error(_request: Request, error: AppError) -> JSONResponse:
        return JSONResponse(
            status_code=error.status_code,
            content={"code": error.code, "message": error.message},
        )