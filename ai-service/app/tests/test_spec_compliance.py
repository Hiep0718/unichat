"""Unit tests for Adaptive Retrieval v1 specification compliance."""

from fastapi.testclient import TestClient
import pytest

from app.core.rag.citation_validator import validate_citations
from app.core.rag.intent_detector import IntentEnum, detect_intent, get_config_hash
from app.core.rag.retrieval_trace import RetrievalTrace, record_trace
from app.main import create_app

client = TestClient(create_app())


def test_config_hash_and_clarify_detection() -> None:
    config_hash = get_config_hash()
    assert config_hash != ""

    res = detect_intent("cái đó là gì")
    assert res.intent == IntentEnum.CLARIFY
    assert res.rule_id == "RULE_AMBIGUOUS_PRONOUN"
    assert res.config_hash == config_hash


def test_citation_validator_allowed_documents() -> None:
    allowed = ["doc-123", "doc-456"]

    valid_citations = [
        {"documentId": "doc-123", "locator": "page:1", "excerpt": "Valid excerpt text"},
    ]
    assert validate_citations(valid_citations, allowed) is True

    invalid_citations = [
        {"documentId": "doc-999", "locator": "page:1", "excerpt": "Unauthorized doc excerpt"},
    ]
    assert validate_citations(invalid_citations, allowed) is False

    empty_excerpt_citations = [
        {"documentId": "doc-123", "locator": "page:1", "excerpt": "   "},
    ]
    assert validate_citations(empty_excerpt_citations, allowed) is False


def test_retrieval_trace_record() -> None:
    trace = RetrievalTrace(
        request_id="req-test-1",
        workspace_id="ws-test-1",
        intent="FACT",
        rule_id="RULE_FACT_EXPLICIT",
        confidence=0.90,
        strategy_version="v1.0",
        config_hash="abc12345",
        allowed_document_count=2,
        decision="ANSWER",
    )
    assert trace.request_id == "req-test-1"
    record_trace(trace)


def test_liveness_and_readiness_endpoints() -> None:
    res_live = client.get("/internal/v1/health/live")
    assert res_live.status_code == 200
    assert res_live.json()["status"] == "ok"

    res_ready = client.get("/internal/v1/health/ready")
    assert res_ready.status_code == 200
    assert res_ready.json()["service"] == "ai-service"


def test_retrieval_answer_clarify_flow() -> None:
    payload = {
        "workspaceId": "ws-100",
        "allowedDocumentIds": ["doc-1"],
        "question": "nó là gì",
    }
    response = client.post("/internal/v1/retrieval/answers", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["decision"] == "CLARIFY"
    assert data["intent"] == "CLARIFY"
    assert data["refusalCode"] == "CLARIFY_REQUIRED"
    assert data["configHash"] is not None
