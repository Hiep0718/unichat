"""Reusable offline fixtures for authenticated Plan V2 AI boundaries."""

import hashlib
import json
import time
from typing import Any
from uuid import uuid4

from fastapi import FastAPI
from fastapi.testclient import TestClient

from app.core.rag.contracts import SourceVersion
from app.core.rag.generation_policy import GenerationPolicy
from app.core.rag.retrieval_engine import RetrievedChunkCandidate
from app.core.security import verify_service_jwt

WORKSPACE_ID = "00000000-0000-4000-8000-000000000001"
DOCUMENT_ID = "00000000-0000-4000-8000-000000000002"
OPERATION_ID = "00000000-0000-4000-8000-000000000003"
DOCUMENT_HASH = "b" * 64
CHUNK_TEXT = "RAG sử dụng tài liệu đã cấp quyền để trả lời."


def source(**overrides: Any) -> SourceVersion:
    """Build a genuine current source snapshot, independent of vector schema labels."""
    return SourceVersion.model_validate({
        "documentId": DOCUMENT_ID, "ingestionVersion": 2,
        "contentHash": DOCUMENT_HASH, "fileName": "RAG.pdf", **overrides,
    })


def candidate(**overrides: Any) -> RetrievedChunkCandidate:
    """Build actual chunk provenance with a hash of the complete retrieved text."""
    values = {
        "chunk_id": "real-chunk-101", "document_id": DOCUMENT_ID,
        "text": CHUNK_TEXT, "similarity": 0.95, "locator_type": "PDF_PAGE",
        "locator_value": "page:1", "content_hash": hashlib.sha256(CHUNK_TEXT.encode()).hexdigest(),
        "ingestion_version": 2, "document_content_hash": DOCUMENT_HASH, **overrides,
    }
    return RetrievedChunkCandidate(**values)


def payload(**overrides: Any) -> dict[str, Any]:
    """Build a validated inbound Core request with default strict RAG mode."""
    return {
        "workspaceId": WORKSPACE_ID, "operationId": OPERATION_ID,
        "allowedDocumentIds": [DOCUMENT_ID], "question": "RAG là gì?",
        "cloudAllowed": True, "permissionVersion": 2, "requestId": str(uuid4()),
        "sources": [source().model_dump(mode="json")], **overrides,
    }


def generated(*, expanded: bool = False, reference: str = "1") -> str:
    """Return complete claims JSON without uncited leftover section content."""
    sections = [{"type": "DOCUMENT", "claims": [
        {"text": "RAG dựa trên tài liệu.", "citationIds": [reference]},
    ]}]
    if expanded:
        sections.append({"type": "EXTERNAL", "claims": [
            {"text": "Đây là kiến thức ngoài tài liệu.", "citationIds": []},
        ]})
    return json.dumps({"sections": sections}, ensure_ascii=False)


def policy() -> GenerationPolicy:
    """Create an operation policy whose network adapter must be mocked in tests."""
    return GenerationPolicy("request-test", OPERATION_ID, True, time.time() + 120)


def api_client(router: Any) -> TestClient:
    """Use only the tested router, avoiding application lifespan broker/network effects."""
    application = FastAPI()
    application.include_router(router, prefix="/internal/v1")
    application.dependency_overrides[verify_service_jwt] = lambda: {"requestId": "req-test"}
    return TestClient(application)
