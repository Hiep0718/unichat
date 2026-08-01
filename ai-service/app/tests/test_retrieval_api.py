from unittest.mock import patch

from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)

def test_retrieval_answer_empty_allowed_docs() -> None:
    res = client.post(
        "/internal/v1/retrieval/answers",
        json={
            "workspaceId": "ws-1",
            "allowedDocumentIds": [],
            "question": "Hỏi đáp CSDL là gì?",
        },
    )
    assert res.status_code == 200
    data = res.json()
    assert data["decision"] == "REFUSE"
    assert data["refusalCode"] == "NO_ALLOWED_DOCUMENTS"

def test_retrieval_answer_success_flow() -> None:
    with patch("app.api.v1.retrieval.retrieve_chunks") as mock_retrieve:
        mock_retrieve.return_value = []
        res = client.post(
            "/internal/v1/retrieval/answers",
            json={
                "workspaceId": "ws-1",
                "allowedDocumentIds": ["doc-1"],
                "question": "So sánh khái niệm A và B",
            },
        )
        assert res.status_code == 200
        data = res.json()
        assert data["decision"] == "REFUSE"
