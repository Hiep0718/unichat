"""FastAPI application factory for the private UniChat AI Service."""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.v1 import api_router
from app.core.logging import configure_logging
from app.core.settings import get_settings
from app.shared.handlers import register_exception_handlers


def create_app() -> FastAPI:
    """Create an environment-configured FastAPI application."""
    settings = get_settings()
    configure_logging(settings.log_level)
    application = FastAPI(
        title=settings.project_name,
        docs_url=None if settings.is_production else "/docs",
        openapi_url=f"{settings.api_v1_prefix}/openapi.json",
    )
    application.add_middleware(
        CORSMiddleware,
        allow_origins=[str(settings.frontend_origin)],
        allow_credentials=True,
        allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE"],
        allow_headers=["Authorization", "Content-Type", "Idempotency-Key", "X-Request-ID"],
    )
    application.include_router(api_router, prefix=settings.api_v1_prefix)
    register_exception_handlers(application)
    return application


app = create_app()