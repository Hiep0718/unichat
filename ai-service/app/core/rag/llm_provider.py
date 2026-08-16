import logging
import os
from typing import Any

from google import genai
from google.genai import types
import httpx

from app.core.rag.citation_validator import validate_citations
from app.core.rag.retrieval_engine import RetrievedChunkCandidate

logger = logging.getLogger(__name__)

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "")
GEMINI_MODEL = os.getenv("GEMINI_MODEL", "gemini-2.5-flash")
OLLAMA_HOST = os.getenv("OLLAMA_HOST", "http://localhost:11434")
ENABLE_OLLAMA_FALLBACK = os.getenv("ENABLE_OLLAMA_FALLBACK", "true").lower() == "true"


def get_gemini_api_keys() -> list[str]:
    """Retrieve ordered list of configured Gemini API keys for retry and failover."""
    keys: list[str] = []

    # 1. Primary API key
    k1 = os.getenv("GEMINI_API_KEY", "").strip()
    if k1:
        keys.append(k1)

    # 2. Secondary API key (GEMINI_API_KEY_2 or GEMINI_API_KEY_SECONDARY)
    k2 = os.getenv("GEMINI_API_KEY_2", "").strip() or os.getenv("GEMINI_API_KEY_SECONDARY", "").strip()
    if k2 and k2 not in keys:
        keys.append(k2)

    # 3. Comma-separated keys list (GEMINI_API_KEYS=key1,key2)
    k_list = os.getenv("GEMINI_API_KEYS", "").strip()
    if k_list:
        for k in k_list.split(","):
            k_clean = k.strip()
            if k_clean and k_clean not in keys:
                keys.append(k_clean)

    return keys


def get_candidate_gemini_models() -> list[str]:
    """Retrieve ordered list of candidate models starting with gemini-3.5-flash."""
    models: list[str] = []

    # 1. Preferred model from ENV (or default gemini-3.5-flash)
    env_model = os.getenv("GEMINI_MODEL", "gemini-3.5-flash").strip()
    if env_model:
        models.append(env_model)

    # 2. Backup candidate models (verified working list)
    backups = ["gemini-3.5-flash", "gemini-2.5-flash", "gemini-flash-latest", "gemini-flash-lite-latest"]
    for b in backups:
        if b not in models:
            models.append(b)

    return models


def generate_rag_answer(
    question: str,
    candidates: list[RetrievedChunkCandidate],
    allowed_document_ids: list[str] | None = None,
    allow_external_knowledge: bool = True,
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

    if allow_external_knowledge:
        system_prompt = (
            "Bạn là trợ lý AI tri thức UniChat.\n"
            "NGUYÊN TẮC THẢO LUẬN (CHẾ ĐỘ RAG + AI MỞ RỘNG):\n"
            "1. Trước tiên, hãy trích xuất và trả lời dựa trên các trích dẫn tài liệu được cung cấp dưới đây, kèm theo số thứ tự trích dẫn [1], [2].\n"
            "2. NẾU TÀI LIỆU CHỈ NÊU TÊN/KÝ HIỆU HOẶC THIẾU CHI TIẾT CỤ THỂ: Hãy chủ động bổ sung phần giải thích chi tiết, định nghĩa hoặc công thức tính toán mở rộng từ Tri thức AI để người dùng nắm rõ. "
            "Bạn BẮT BUỘC phải đặt tiêu đề cho phần mở rộng này là: '🌐 **Giải thích mở rộng từ Tri thức AI (Nguồn ngoài kho tài liệu):**'.\n"
            "3. Tuyệt đối không nhầm lẫn giữa thông tin có trong tài liệu [1] và thông tin giải thích mở rộng ngoài tài liệu.\n"
            "4. ĐỊNH DẠNG CÔNG THỨC TOÁN HỌC: Khi viết ký hiệu hoặc công thức toán học, BẮT BUỘC dùng định dạng KaTeX:\n"
            "   - Ký hiệu cùng dòng dùng cặp dấu đô-la đơn: $ký_hiệu$ (ví dụ: $E$, $\\sigma$, $O$, $P$, $M$).\n"
            "   - Công thức phân số/tính toán nổi bật dùng cặp dấu đô-la đôi trên dòng riêng: $$công_thức$$ (ví dụ: $$E = \\frac{O + 4M + P}{6}$$).\n"
            "5. SƠ ĐỒ TRỰC QUAN (MERMAID): Khi câu trả lời liên quan đến quy trình, phân cấp, so sánh, quan hệ hoặc luồng nghiệp vụ, "
            "BẮT BUỘC tạo ít nhất 1 sơ đồ Mermaid bằng khối code ```mermaid. Các loại sơ đồ phù hợp:\n"
            "   - mindmap: khi liệt kê/phân loại nhiều khái niệm liên quan.\n"
            "   - flowchart TD: khi mô tả quy trình, luồng xử lý.\n"
            "   - sequenceDiagram: khi mô tả tương tác giữa các bên/hệ thống.\n"
            "   - classDiagram: khi mô tả cấu trúc hoặc thuộc tính đối tượng.\n"
            "   - gantt: khi liên quan đến kế hoạch, lịch trình.\n"
            "   - pie: khi muốn thể hiện tỉ lệ phần trăm.\n"
            "   Ví dụ sơ đồ mindmap:\n"
            "   ```mermaid\n"
            "   mindmap\n"
            "     root((Chủ đề))\n"
            "       Nhánh A\n"
            "         Chi tiết A1\n"
            "         Chi tiết A2\n"
            "       Nhánh B\n"
            "         Chi tiết B1\n"
            "   ```\n"
            "6. LUẬT BẮT BUỘC Ở CUỐI CÂU TRẢ LỜI: Ngay sau khi hoàn thành toàn bộ câu trả lời, "
            "bạn BẮT BUỘC phải tạo một đường phân cách '\\n\\n---\\n\\n' và mỗi gợi ý BẮT BUỘC phải ở một dòng riêng bắt đầu bằng dấu gạch ngang '- ' như sau:\n\n"
            "---\n\n"
            "### 💡 Gợi ý câu hỏi & bước tiếp theo:\n"
            "- [Gợi ý câu hỏi chuyên sâu 1 liên quan tới chủ đề trên]\n"
            "- [Gợi ý hành động hoặc câu hỏi mở rộng 2]\n\n"
            f"NGỮ CẢNH TÀI LIỆU:\n{context_str}"
        )
    else:
        system_prompt = (
            "Bạn là trợ lý AI tri thức UniChat.\n"
            "NGUYÊN TẮC TRẢ LỜI (CHẾ ĐỘ STRICT RAG - CHỈ THEO TÀI LIỆU):\n"
            "1. Hãy trả lời câu hỏi dựa CHÍNH XÁC và TUYỆT ĐỐI vào các trích dẫn tài liệu được cung cấp dưới đây.\n"
            "2. Tuyệt đối không tự bịa thông tin hoặc bổ sung tri thức ngoài tài liệu. Khi đưa ra thông tin factual, hãy chỉ rõ [1], [2].\n"
            "3. Nêu rõ nếu tài liệu không cung cấp thêm thông tin chi tiết.\n"
            "4. ĐỊNH DẠNG CÔNG THỨC TOÁN HỌC: Khi viết ký hiệu hoặc công thức toán học, BẮT BUỘC dùng định dạng KaTeX:\n"
            "   - Ký hiệu cùng dòng dùng cặp dấu đô-la đơn: $ký_hiệu$.\n"
            "   - Công thức phân số/tính toán nổi bật dùng cặp dấu đô-la đôi trên dòng riêng: $$công_thức$$.\n"
            "5. SƠ ĐỒ TRỰC QUAN (MERMAID): Khi câu trả lời liên quan đến quy trình, phân cấp, so sánh, quan hệ hoặc luồng nghiệp vụ có trong tài liệu, "
            "hãy tạo sơ đồ Mermaid bằng khối code ```mermaid để minh họa trực quan. "
            "Chỉ dùng thông tin CÓ TRONG tài liệu để vẽ sơ đồ. Các loại sơ đồ: mindmap, flowchart TD, sequenceDiagram, classDiagram, gantt, pie.\n"
            "6. LUẬT BẮT BUỘC Ở CUỐI CÂU TRẢ LỜI: Ngay sau khi hoàn thành toàn bộ câu trả lời, "
            "bạn BẮT BUỘC phải tạo một đường phân cách '\\n\\n---\\n\\n' và mỗi gợi ý BẮT BUỘC phải ở một dòng riêng bắt đầu bằng dấu gạch ngang '- ' như sau:\n\n"
            "---\n\n"
            "### 💡 Gợi ý câu hỏi & bước tiếp theo:\n"
            "- [Gợi ý câu hỏi chuyên sâu 1 liên quan tới chủ đề trên]\n"
            "- [Gợi ý hành động hoặc câu hỏi mở rộng 2]\n\n"
            f"NGỮ CẢNH TÀI LIỆU:\n{context_str}"
        )

    should_fallback = False
    gemini_keys = get_gemini_api_keys()
    candidate_models = get_candidate_gemini_models()

    # Try official Gemini SDK across configured API keys & candidate models
    if gemini_keys:
        for k_idx, key in enumerate(gemini_keys, start=1):
            for m_idx, model in enumerate(candidate_models, start=1):
                try:
                    logger.info(
                        "Attempting Gemini RAG generation (Key #%d/%d, Model #%d/%d: %s)...",
                        k_idx,
                        len(gemini_keys),
                        m_idx,
                        len(candidate_models),
                        model,
                    )
                    answer, used_model = call_gemini_api(
                        system_prompt,
                        question,
                        api_key=key,
                        target_model=model,
                    )
                    return {
                        "answer": answer,
                        "citations": citations,
                        "provider": used_model,
                    }
                except (TimeoutError, ConnectionError, httpx.TimeoutException, httpx.ConnectError) as e:
                    logger.warning(
                        "Gemini Key #%d, Model '%s' network error (%s: %s). Trying next candidate...",
                        k_idx,
                        model,
                        type(e).__name__,
                        e,
                    )
                    should_fallback = True
                except httpx.HTTPStatusError as e:
                    if e.response.status_code in (429, 500, 502, 503, 504):
                        logger.warning(
                            "Gemini Key #%d, Model '%s' HTTP %s error. Trying next candidate...",
                            k_idx,
                            model,
                            e.response.status_code,
                        )
                        should_fallback = True
                    else:
                        logger.warning(
                            "Gemini Key #%d, Model '%s' HTTP %s error. Trying next candidate...",
                            k_idx,
                            model,
                            e.response.status_code,
                        )
                except Exception as e:
                    err_str = str(e)
                    if "404" in err_str or "NOT_FOUND" in err_str.upper():
                        logger.info(
                            "Gemini Key #%d model '%s' not supported (404). Trying next candidate model...",
                            k_idx,
                            model,
                        )
                    elif any(kw in err_str.upper() for kw in ("429", "RESOURCE_EXHAUSTED", "QUOTA", "RATE_LIMIT")):
                        logger.warning(
                            "Gemini Key #%d, Model '%s' rate limit/quota exceeded (%s). Trying next candidate...",
                            k_idx,
                            model,
                            err_str,
                        )
                        should_fallback = True
                    else:
                        logger.warning(
                            "Gemini Key #%d, Model '%s' failed (%s: %s). Trying next candidate...",
                            k_idx,
                            model,
                            type(e).__name__,
                            e,
                            )
                        should_fallback = True
    else:
        # No Gemini key configured -> allow fallback in dev mode
        should_fallback = True

    # Ollama Local Fallback (Only for transient/network/rate-limit errors)
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


def call_gemini_api(
    system_prompt: str,
    question: str,
    api_key: str | None = None,
    target_model: str | None = None,
) -> tuple[str, str]:
    """Call Gemini using official google-genai SDK (R-04 mitigation) with target API key, model, and max output tokens."""
    key_to_use = api_key or os.getenv("GEMINI_API_KEY", "")
    client = genai.Client(api_key=key_to_use)
    model_name = target_model or os.getenv("GEMINI_MODEL", "gemini-3.5-flash")

    # Set max_output_tokens=8192 to prevent premature output truncation
    config = types.GenerateContentConfig(
        max_output_tokens=8192,
        temperature=0.3,
    )

    response = client.models.generate_content(
        model=model_name,
        contents=f"{system_prompt}\n\nCÂU HỎI: {question}",
        config=config,
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
