"""Versioned private API router."""

from fastapi import APIRouter, Depends

from app.api.v1.ai_metrics import router as ai_metrics_router
from app.api.v1.eval import router as eval_router
from app.api.v1.health import router as health_router
from app.api.v1.retrieval import router as retrieval_router
from app.core.security import verify_service_jwt

api_router = APIRouter()
api_router.include_router(health_router, tags=["health"])
api_router.include_router(retrieval_router, tags=["retrieval"])
api_router.include_router(eval_router, tags=["eval"], dependencies=[Depends(verify_service_jwt)])
api_router.include_router(ai_metrics_router, tags=["ai-metrics"])
