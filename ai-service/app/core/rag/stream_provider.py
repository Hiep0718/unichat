"""Streaming RAG Provider using official google-genai SDK generate_content_stream.

Yields Server-Sent Events (SSE) formatted strings:
- event: metadata
- event: token
- event: done
- event: error
"""

import json
import logging
import os
from typing import AsyncGenerator, Any

from google import genai
from google.genai import types

from app.core.rag.citation_validator import validate_citations
from app.core.rag.llm_provider import (
    MAX_SINGLE_CHUNK_CHARS,
    get_candidate_gemini_models,
    get_gemini_api_keys,
)
from app.core.rag.retrieval_engine import RetrievedChunkCandidate

logger = logging.getLogger(__name__)


def build_system_prompt(allow_external_knowledge: bool = True) -> str:
    """Build system prompt for RAG answer generation."""
    if allow_external_knowledge:
        return (
            "Bạn là trợ lý AI tri thức UniChat.\n"
            "NGUYÊN TẮC THẢO LUẬN (CHẾ ĐỘ RAG + AI MỞ RỘNG):\n"
            "1. Trước tiên, hãy trích xuất và trả lời dựa trên các trích dẫn tài liệu được cung cấp dưới đây, kèm theo số thứ tự trích dẫn [1], [2].\n"
            "2. NẾU TÀI LIỆU CHỈ NÊU TÊN/KÝ HIỆU HOẶC THIẾU CHI TIẾT CỤ THỂ: Hãy chủ động bổ sung phần giải thích chi tiết, định nghĩa hoặc công thức tính toán mở rộng từ Tri thức AI để người dùng nắm rõ. "
            "Bạn BẮT BUỘC phải đặt tiêu đề cho phần mở rộng này là: '🌐 **Giải thích mở rộng từ Tri thức AI (Nguồn ngoài kho tài liệu):**'.\n"
            "3. Tuyệt đối không nhầm lẫn giữa thông tin có trong tài liệu [1] và thông tin giải thích mở rộng ngoài tài liệu.\n"
            "4. ĐỊNH DẠNG VĂN BẢN: Hãy trình bày văn bản một cách chuyên nghiệp, sạch đẹp. Dùng danh sách có dấu gạch ngang '-', in đậm từ khóa quan trọng và chia đoạn rõ ràng.\n"
            "5. ĐỊNH DẠNG CÔNG THỨC TOÁN HỌC: Khi viết ký hiệu hoặc công thức toán học, BẮT BUỘC dùng định dạng KaTeX:\n"
            "   - Ký hiệu cùng dòng dùng cặp dấu đô-la đơn: $ký_hiệu$.\n"
            "   - Công thức phân số/tính toán nổi bật dùng cặp dấu đô-la đôi trên dòng riêng: $$công_thức$$.\n"
            "6. SƠ ĐỒ TRỰC QUAN SINH ĐỘNG (MERMAID): Khi câu trả lời liên quan đến quy trình, phân cấp, so sánh, quan hệ hoặc luồng nghiệp vụ có trong tài liệu, "
            "hãy tạo sơ đồ Mermaid bằng khối code ```mermaid. BẮT BUỘC ĐẶT BIỂU TƯỢNG EMOJI VÀO ĐẦU NHÃN CỦA MỖI NODE (ví dụ: 🎯, ⚡, ⏳, 📊, 🚩, 💡) và bọc tên node trong ngoặc kép A[\"🎯 Tên Node\"]. "
            "Luôn dùng hình dạng node đa dạng ([...], [(...)], {{...}}) và màu sắc phân biệt bằng classDef.\n"
            "7. GỢI Ý CÂU HỎI TIẾP THEO (FOLLOW-UP PROMPTS): Sau khi hoàn thành toàn bộ câu trả lời, "
            "hãy BẮT BUỘC tự động đề xuất 3 câu hỏi gợi ý tiếp theo một cách thông minh, liên quan trực tiếp đến chủ đề vừa thảo luận. "
            "Phần gợi ý này BẮT BUỘC phải nằm ở CUỐI CÙNG của câu trả lời, phân cách bằng một dòng tiêu đề: '💡 **Gợi ý câu hỏi tiếp theo:**\\n\\n' và mỗi gợi ý BẮT BUỘC phải ở một dòng riêng bắt đầu bằng dấu gạch ngang '- ' như sau:\n\n"
            "💡 **Gợi ý câu hỏi tiếp theo:**\n"
            "- [Câu hỏi gợi ý 1]?\n"
            "- [Câu hỏi gợi ý 2]?\n"
            "- [Câu hỏi gợi ý 3]?\n"
        )
    return (
        "Bạn là trợ lý AI tri thức UniChat.\n"
        "NGUYÊN TẮC THẢO LUẬN (CHỈ DỰA TRÊN TÀI LIỆU NỘI BỘ):\n"
        "1. CHỈ sử dụng thông tin có trong các tài liệu được cung cấp dưới đây.\n"
        "2. Kèm số thứ tự trích dẫn [1], [2] cho mọi thông tin trích xuất.\n"
        "3. Nếu tài liệu không chứa đủ thông tin để trả lời, hãy thành thật từ chối."
    )


def format_sse(event: str, data: dict[str, Any]) -> str:
    """Format data payload as SSE string."""
    return f"event: {event}\ndata: {json.dumps(data, ensure_ascii=False)}\n\n"


async def generate_rag_answer_stream(
    question: str,
    candidates: list[RetrievedChunkCandidate],
    intent: str = "FACT",
    strategy_version: str = "v1.0",
    request_id: str = "",
    allowed_document_ids: list[str] | None = None,
    allow_external_knowledge: bool = True,
    evidence_score: float | None = None,
) -> AsyncGenerator[str, None]:
    """Async generator yielding SSE formatted strings for streaming RAG answers."""
    context_blocks = []
    citations = []

    for idx, c in enumerate(candidates, start=1):
        text = c.text[:MAX_SINGLE_CHUNK_CHARS]
        context_blocks.append(
            f"[{idx}] (Tài liệu: {c.document_id}, Vị trí: {c.locator_value}):\n{text}"
        )
        citations.append({
            "citationId": str(idx),
            "documentId": c.document_id,
            "locator": c.locator_value,
            "excerpt": text[:200],
            "score": c.similarity,
        })

    allowed_ids = allowed_document_ids or [c.document_id for c in candidates if c.document_id]

    if not validate_citations(citations, allowed_ids):
        logger.warning("Citation validation failed for retrieved candidates in stream.")
        yield format_sse("metadata", {
            "decision": "REFUSE",
            "intent": intent,
            "strategyVersion": strategy_version,
            "refusalCode": "REJECTED_CITATIONS",
            "refusalReason": "Xác thực trích dẫn thất bại.",
            "citations": [],
            "evidenceScore": evidence_score,
            "requestId": request_id,
        })
        yield format_sse("done", {
            "messageId": request_id,
            "refusalCode": "REJECTED_CITATIONS",
            "providerModel": "rejected-citations",
        })
        return

    context_str = "\n\n".join(context_blocks)
    system_prompt = build_system_prompt(allow_external_knowledge)
    full_prompt = f"{system_prompt}\n\n--- TÀI LIỆU KHỞI THỦY ---\n{context_str}\n\nCÂU HỎI: {question}"

    gemini_keys = get_gemini_api_keys()
    candidate_models = get_candidate_gemini_models()

    if not gemini_keys:
        logger.error("No GEMINI_API_KEY configured for streaming.")
        yield format_sse("metadata", {
            "decision": "REFUSE",
            "intent": intent,
            "strategyVersion": strategy_version,
            "refusalCode": "PROVIDER_UNAVAILABLE",
            "refusalReason": "Dịch vụ AI chưa được cấu hình API Key.",
            "citations": citations,
            "evidenceScore": evidence_score,
            "requestId": request_id,
        })
        yield format_sse("done", {
            "messageId": request_id,
            "refusalCode": "PROVIDER_UNAVAILABLE",
            "providerModel": "provider-unavailable",
        })
        return

    config = types.GenerateContentConfig(
        max_output_tokens=8192,
        temperature=0.3,
    )

    success_stream = False
    used_model_name = candidate_models[0] if candidate_models else "gemini-2.5-flash"

    for k_idx, key in enumerate(gemini_keys, start=1):
        if success_stream:
            break

        client = genai.Client(api_key=key)

        for m_idx, model in enumerate(candidate_models, start=1):
            try:
                logger.info(
                    "Attempting Gemini SSE streaming generation (Key #%d/%d, Model #%d/%d: %s)...",
                    k_idx, len(gemini_keys), m_idx, len(candidate_models), model
                )
                stream = client.models.generate_content_stream(
                    model=model,
                    contents=full_prompt,
                    config=config,
                )

                used_model_name = model

                # First event: metadata
                yield format_sse("metadata", {
                    "decision": "ANSWER",
                    "intent": intent,
                    "strategyVersion": strategy_version,
                    "citations": citations,
                    "evidenceScore": evidence_score,
                    "providerModel": used_model_name,
                    "requestId": request_id,
                })

                for chunk in stream:
                    if chunk.text:
                        yield format_sse("token", {"delta": chunk.text})

                success_stream = True
                break

            except Exception as e:
                logger.warning(
                    "Gemini SSE streaming Key #%d, Model '%s' error: %s. Trying next...",
                    k_idx, model, e
                )

    if success_stream:
        yield format_sse("done", {
            "messageId": request_id,
            "refusalCode": None,
            "providerModel": used_model_name,
        })
    else:
        logger.error("All Gemini streaming candidates failed.")
        yield format_sse("metadata", {
            "decision": "REFUSE",
            "intent": intent,
            "strategyVersion": strategy_version,
            "refusalCode": "PROVIDER_UNAVAILABLE",
            "refusalReason": "Tất cả các dịch vụ LLM hiện tại không thể phản hồi.",
            "citations": citations,
            "evidenceScore": evidence_score,
            "requestId": request_id,
        })
        yield format_sse("done", {
            "messageId": request_id,
            "refusalCode": "PROVIDER_UNAVAILABLE",
            "providerModel": "provider-unavailable",
        })
