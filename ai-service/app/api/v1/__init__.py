"""Versioned private API router."""

from fastapi import APIRouter

from app.api.v1.health import router as health_router
from app.api.v1.retrieval import router as retrieval_router
from app.api.v1.eval import router as eval_router

api_router = APIRouter()
api_router.include_router(health_router, tags=["health"])
api_router.include_router(retrieval_router, tags=["retrieval"])
api_router.include_router(eval_router, tags=["eval"])