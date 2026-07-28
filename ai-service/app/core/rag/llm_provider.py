import os
import json
import logging
from typing import Any, Dict, List
import httpx
from app.core.rag.retrieval_engine import RetrievedChunkCandidate

logger = logging.getLogger(__name__)

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "")
OLLAMA_HOST = os.getenv("OLLAMA_HOST", "http://localhost:11434")

def generate_rag_answer(
    question: str,
    candidates: List[RetrievedChunkCandidate],
) -> Dict[str, Any]:
    context_blocks = []
    citations = []

    for idx, c in enumerate(candidates, start=1):
        context_blocks.append(f"[{idx}] (Tài liệu: {c.document_id}, Vị trí: {c.locator_value}):\n{c.text}")
        citations.append({
            "citationId": str(idx),
            "documentId": c.document_id,
            "locator": c.locator_value,
            "excerpt": c.text[:200],
            "score": c.similarity,
        })

    context_str = "\n\n".join(context_blocks)
    system_prompt = (
        "Bạn là trợ lý AI tri thức UniChat. Hãy trả lời câu hỏi dựa CHÍNH XÁC vào các trích dẫn tài liệu được cung cấp dưới đây.\n"
        "Tuyệt đối không tự bịa thông tin ngoài tài liệu. Khi đưa ra thông tin factual, hãy chỉ rõ số thứ tự trích dẫn [1], [2].\n\n"
        f"NGỮ CẢNH TÀI LIỆU:\n{context_str}"
    )

    # Try Gemini API primary
    if GEMINI_API_KEY:
        try:
            answer = call_gemini_api(system_prompt, question)
            return {
                "answer": answer,
                "citations": citations,
                "provider": "gemini-3.5-flash",
            }
        except Exception as e:
            logger.warning(f"Gemini API call failed: {e}. Falling back to Ollama.")

    # Ollama Local Fallback
    try:
        answer = call_ollama_fallback(system_prompt, question)
        return {
            "answer": answer,
            "citations": citations,
            "provider": "ollama-local",
        }
    except Exception as e:
        logger.error(f"Ollama fallback failed: {e}")
        return {
            "answer": "Dựa trên các tài liệu thu hồi:\n" + "\n".join([f"- {c.text}" for c in candidates[:3]]),
            "citations": citations,
            "provider": "extractive-fallback",
        }

def call_gemini_api(system_prompt: str, question: str) -> str:
    url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key={GEMINI_API_KEY}"
    payload = {
        "contents": [
            {"role": "user", "parts": [{"text": f"{system_prompt}\n\nCÂU HỎI: {question}"}]}
        ]
    }
    with httpx.Client(timeout=15.0) as client:
        res = client.post(url, json=payload)
        res.raise_for_status()
        data = res.json()
        return data["candidates"][0]["content"]["parts"][0]["text"]

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
        return res.json().get("response", "")
