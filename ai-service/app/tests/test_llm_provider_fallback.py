from unittest.mock import patch

import httpx

from app.core.rag.llm_provider import generate_rag_answer
from app.core.rag.retrieval_engine import RetrievedChunkCandidate


@patch("app.core.rag.llm_provider.ENABLE_OLLAMA_FALLBACK", True)
def test_generate_rag_answer_gemini_failure_fallback_to_ollama() -> None:
    candidates = [
        RetrievedChunkCandidate("chunk1", "doc1", "Đoạn trích tri thức CSDL", 0.85, "PDF_PAGE", "page:1", "hash1")
    ]

    dummy_request = httpx.Request("POST", "https://localhost")
    dummy_response = httpx.Response(429, request=dummy_request)
    err = httpx.HTTPStatusError("429 Too Many Requests", request=dummy_request, response=dummy_response)

    # Mock Gemini call_gemini_api to raise exception (HTTP 429 / 503)
    # Mock Ollama call_ollama_fallback to succeed
    with patch("app.core.rag.llm_provider.call_gemini_api", side_effect=err):
        with patch("app.core.rag.llm_provider.call_ollama_fallback", return_value="Câu trả lời từ Ollama Local"):
            res = generate_rag_answer("Hỏi đáp CSDL", candidates)
            assert res["provider"] == "ollama-local"
            assert "Ollama Local" in res["answer"]
            assert len(res["citations"]) == 1


@patch("app.core.rag.llm_provider.ENABLE_OLLAMA_FALLBACK", True)
def test_generate_rag_answer_all_llms_fail_returns_refuse() -> None:
    candidates = [
        RetrievedChunkCandidate("chunk1", "doc1", "Đoạn trích trích xuất trực tiếp", 0.90, "PDF_PAGE", "page:1", "hash1")
    ]

    # Mock both Gemini and Ollama calls to fail
    with patch("app.core.rag.llm_provider.call_gemini_api", side_effect=Exception("Gemini Outage")):
        with patch("app.core.rag.llm_provider.call_ollama_fallback", side_effect=Exception("Ollama Offline")):
            res = generate_rag_answer("Hỏi đáp CSDL", candidates)
            assert res["provider"] == "provider-unavailable"
            assert res["answer"] is None
            assert res["validationFailed"] is True


def test_generate_rag_answer_multi_key_retry_success() -> None:
    candidates = [
        RetrievedChunkCandidate("chunk1", "doc1", "Đoạn trích tri thức CSDL", 0.85, "PDF_PAGE", "page:1", "hash1")
    ]

    # First call with Key 1 fails (Rate Limit 429), second call with Key 2 succeeds
    err_429 = Exception("429 RESOURCE_EXHAUSTED: Quota exceeded")
    success_return = ("Trả lời thành công từ API Key 2 [1].", "gemini-3.5-flash")

    with patch("app.core.rag.llm_provider.get_gemini_api_keys", return_value=["key_primary"]):
        with patch("app.core.rag.llm_provider.get_candidate_gemini_models", return_value=["gemini-3.5-flash", "gemini-2.5-flash"]):
            with patch("app.core.rag.llm_provider.call_gemini_api", side_effect=[err_429, success_return]) as mock_call:
                res = generate_rag_answer("Hỏi đáp CSDL", candidates)
                assert mock_call.call_count == 2
                assert res["answer"] == "Trả lời thành công từ API Key 2 [1]."
                assert res["provider"] == "gemini-3.5-flash"


