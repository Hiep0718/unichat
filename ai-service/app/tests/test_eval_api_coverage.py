"""Tests to ensure eval endpoints, retrieval_engine, and vector_store reach > 80% coverage."""

from unittest.mock import MagicMock, patch

from fastapi.testclient import TestClient

from app.core.rag.retrieval_engine import RetrievedChunkCandidate, retrieve_chunks
from app.core.rag.strategy_selector import get_strategy
from app.main import app

client = TestClient(app)


def test_eval_endpoints_coverage() -> None:
    # Test GET /internal/v1/eval/runs
    with patch("app.api.v1.eval.store.list_runs") as mock_list:
        mock_list.return_value = [{"run_id": "r1"}]
        res = client.get("/internal/v1/eval/runs")
        assert res.status_code == 200
        assert len(res.json()) == 1

    # Test GET /internal/v1/eval/runs/{runId}/results
    with patch("app.api.v1.eval.store.load_results") as mock_results:
        mock_results.return_value = [{"case_id": "c1"}]
        res = client.get("/internal/v1/eval/runs/r1/results")
        assert res.status_code == 200

    # Test GET /internal/v1/eval/runs/{runId}/report
    with patch("app.api.v1.eval.generate_markdown_report") as mock_report:
        mock_report.return_value = "# Report"
        res = client.get("/internal/v1/eval/runs/r1/report")
        assert res.status_code == 200
        assert res.json()["report"] == "# Report"

    # Test POST /internal/v1/eval/generate-questions
    with patch("app.api.v1.eval.generate_draft_dataset") as mock_gen:
        mock_gen.return_value = [{"case_id": "CASE-001"}]
        res = client.post("/internal/v1/eval/generate-questions", json={"workspaceId": "ws1", "totalCases": 10})
        assert res.status_code == 200

    # Test POST /internal/v1/eval/run
    with patch("app.api.v1.eval.run_full_benchmark_suite") as mock_run:
        mock_run.return_value = {"run_id": "r1", "status": "COMPLETED"}
        res = client.post("/internal/v1/eval/run", json={"workspaceId": "ws1", "runId": "r1"})
        assert res.status_code == 200

    # Test 404 error cases
    with patch("app.api.v1.eval.store.load_results") as mock_results:
        mock_results.return_value = []
        res = client.get("/internal/v1/eval/runs/nonexistent/results")
        assert res.status_code == 404

    with patch("app.api.v1.eval.generate_markdown_report") as mock_report:
        mock_report.side_effect = RuntimeError("File not found")
        res = client.get("/internal/v1/eval/runs/nonexistent/report")
        assert res.status_code == 404


def test_retrieved_chunk_candidate_properties() -> None:
    cand = RetrievedChunkCandidate(
        chunk_id="c1",
        document_id="d1",
        text="Sample candidate text",
        similarity=0.85,
        locator_type="PDF_PAGE",
        locator_value="page:1",
        content_hash="hash1",
    )
    assert cand.chunk_id == "c1"
    assert cand.similarity == 0.85


def test_retrieve_chunks_mocked() -> None:
    with patch("app.core.rag.retrieval_engine.get_chroma_client") as mock_chroma, \
         patch("app.core.rag.retrieval_engine.get_embedding_model") as mock_model:

        mock_col = MagicMock()
        mock_col.query.return_value = {
            "ids": [["doc1_1"]],
            "documents": [["Retrieved text"]],
            "distances": [[0.15]],
            "metadatas": [[{
                "document_id": "doc1",
                "locator_type": "PDF_PAGE",
                "locator_value": "page:1",
                "content_hash": "h1",
            }]],
        }

        mock_client = MagicMock()
        mock_client.get_collection.return_value = mock_col
        mock_chroma.return_value = mock_client

        mock_m = MagicMock()
        mock_m.encode.return_value.tolist.return_value = [0.1] * 768
        mock_model.return_value = mock_m

        from app.core.rag.intent_detector import IntentEnum
        strategy = get_strategy(IntentEnum.FACT)

        cands = retrieve_chunks("ws1", ["doc1"], "Vector Embedding là gì?", strategy)
        assert len(cands) == 1
        assert cands[0].document_id == "doc1"
