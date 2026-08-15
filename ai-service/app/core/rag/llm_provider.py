import logging
import os
from typing import Any

from google import genai
import httpx

from app.core.rag.citation_validator import validate_citations
from app.core.rag.retrieval_engine import RetrievedChunkCandidate

logger = logging.getLogger(__name__)

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "")
GEMINI_MODEL = os.getenv("GEMINI_MODEL", "gemini-2.5-flash")
OLLAMA_HOST = os.getenv("OLLAMA_HOST", "http://localhost:11434")
ENABLE_OLLAMA_FALLBACK = os.getenv("ENABLE_OLLAMA_FALLBACK", "true").lower() == "true"


def generate_rag_answer(
    question: str,
    candidates: list[RetrievedChunkCandidate],
    allowed_document_ids: list[str] | None = None,
) -> dict[str, Any]:
    context_blocks = []
    citations = []

    for idx, c in enumerate(candidates, start=1):
        context_blocks.append(
            f"[{idx}] (Tài liệu: {c.document_id}, Vị trí: {c.locator_value}):\n{c.text}"
        )
        citations.append({
            "citationId": str(idx),
            "documentId": c.document_id,
            "locator": c.locator_value,
            "excerpt": c.text[:200],
            "score": c.similarity,
        })

    allowed_ids = allowed_document_ids or [c.document_id for c in candidates if c.document_id]

    if not validate_citations(citations, allowed_ids):
        logger.warning("Citation validation failed for retrieved candidates.")
        return {
            "answer": None,
            "citations": [],
            "provider": "rejected-citations",
            "validationFailed": True,
        }

    context_str = "\n\n".join(context_blocks)
    system_prompt = (
        "Bạn là trợ lý AI tri thức UniChat. Hãy trả lời câu hỏi dựa CHÍNH XÁC vào "
        "các trích dẫn tài liệu được cung cấp dưới đây.\n"
        "Tuyệt đối không tự bịa thông tin ngoài tài liệu. Khi đưa ra thông tin factual, "
        "hãy chỉ rõ số thứ tự trích dẫn [1], [2].\n\n"
        f"NGỮ CẢNH TÀI LIỆU:\n{context_str}"
    )

    should_fallback = False

    # Try official Gemini SDK primary (R-04)
    if GEMINI_API_KEY:
        try:
            answer, used_model = call_gemini_api(system_prompt, question)
            return {
                "answer": answer,
                "citations": citations,
                "provider": used_model,
            }
        except (TimeoutError, ConnectionError, httpx.TimeoutException, httpx.ConnectError) as e:
            logger.warning("Gemini transient network error (%s), enabling fallback: %s", type(e).__name__, e)
            should_fallback = True
        except httpx.HTTPStatusError as e:
            if e.response.status_code in (429, 500, 502, 503, 504):
                logger.warning("Gemini server error HTTP %s, enabling fallback: %s", e.response.status_code, e)
                should_fallback = True
            else:
                logger.error("Gemini client error HTTP %s, fallback disabled: %s", e.response.status_code, e)
                should_fallback = False
        except Exception as e:
            logger.error("Gemini non-transient call failed (%s), fallback disabled: %s", type(e).__name__, e)
            should_fallback = False
    else:
        # No Gemini key configured -> allow fallback in dev mode
        should_fallback = True

    # Ollama Local Fallback (Only for transient/network errors)
    if ENABLE_OLLAMA_FALLBACK and should_fallback:
        try:
            answer = call_ollama_fallback(system_prompt, question)
            return {
                "answer": answer,
                "citations": citations,
                "provider": "ollama-local",
            }
        except Exception as e:
            logger.error("Ollama fallback call failed: %s", e)

    # Provider failed -> Return REFUSE (User Decision #4: no extractive fallback)
    logger.error("All available LLM providers failed to produce an answer.")
    return {
        "answer": None,
        "citations": [],
        "provider": "provider-unavailable",
        "validationFailed": True,
    }


def call_gemini_api(system_prompt: str, question: str) -> tuple[str, str]:
    """Call Gemini using official google-genai SDK (R-04 mitigation)."""
    client = genai.Client(api_key=GEMINI_API_KEY)
    model_name = GEMINI_MODEL

    response = client.models.generate_content(
        model=model_name,
        contents=f"{system_prompt}\n\nCÂU HỎI: {question}",
    )
    answer_text = response.text or ""
    return answer_text, model_name


def call_ollama_fallback(system_prompt: str, question: str) -> str:
    url = f"{OLLAMA_HOST}/api/generate"
    payload = {
        "model": "llama3",
        "prompt": f"{system_prompt}\n\nCÂU HỎI: {question}",
        "stream": False,
    }
    with httpx.Client(timeout=30.0) as client:
        res = client.post(url, json=payload)
        res.raise_for_status()
        return str(res.json().get("response", ""))
