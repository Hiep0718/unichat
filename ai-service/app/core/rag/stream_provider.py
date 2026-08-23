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
    """Build system prompt for NotebookLM-grade RAG answer generation."""
    if allow_external_knowledge:
        return (
            "Bạn là chuyên gia AI tri thức cao cấp UniChat (được thiết kế để phân tích và suy luận tri thức sâu sắc như NotebookLM).\n"
            "NGUYÊN TẮC SUY LUẬN & TRÌNH BÀY (CHẾ ĐỘ TỔNG HỢP TRI THỨC NÂNG CAO):\n"
            "1. TỔNG HỢP TRI THỨC TOÀN DIỆN & HỢP NHẤT: Nhìn nhận toàn bộ các tài liệu trích xuất dưới đây như MỘT KHO TRI THỨC HOÀN CHỈNH. "
            "Nhiệm vụ của bạn là kết hợp các dữ kiện trích xuất và tư duy logic chuyên môn để tạo nên câu trả lời sâu sắc, bài bản, chuyên nghiệp và đầy đủ giá trị học thuật nhất.\n"
            "2. GÁN TRÍCH DẪN TỰ NHIÊN: Đặt các chỉ số trích dẫn [1], [2] ngay tại vị trí trích xuất sự thật từ tài liệu. "
            "TUYỆT ĐỐI KHÔNG chia tách văn bản thành các mục nhân tạo như 'Theo tài liệu' hay 'Giải thích mở rộng ngoài tài liệu'. "
            "Hãy hòa quyện tri thức từ tài liệu và khả năng phân tích nâng cao thành MỘT CÂU TRẢ LỜI ĐỒNG NHẤT, MẠCH LẠC VÀ SẮC NÉI.\n"
            "3. CẤU TRÚC BÀI VIẾT BÀI BẢN & CHI TIẾT (NotebookLM Style):\n"
            "   - Sử dụng các tiêu đề rõ ràng (### 1. Tổng quan & Khái niệm cốt lõi, ### 2. Phân tích chi tiết & Các trụ cột chính, ### 3. Ví dụ & Ứng dụng thực tế).\n"
            "   - Phân tích sâu ĐIỀU KIỆN, NGUYÊN NHÂN, TÁC ĐỘNG và HỆ QUẢ (ví dụ: Bảo mật dữ liệu qua Encapsulation/Validation, Khả năng bảo trì qua Loose Coupling/Implementation Hiding).\n"
            "   - Đưa ra ví dụ minh họa trực quan, đoạn mã nguồn ngắn gọn (Java, Python, SQL...) có chú thích rõ ràng khi trả lời các câu hỏi kỹ thuật.\n"
            "4. ĐỊNH DẠNG CÔNG THỨC TOÁN HỌC (KaTeX):\n"
            "   - Ký hiệu cùng dòng dùng cặp dấu đô-la đơn: $ký_hiệu$.\n"
            "   - Công thức nổi bật dùng cặp dấu đô-la đôi trên dòng riêng: $$công_thức$$.\n"
            "5. SƠ ĐỒ TRỰC QUAN SINH ĐỘNG (MERMAID): Khi vẽ sơ đồ quy trình, kiến trúc, phân cấp hay mối quan hệ: "
            "TUYỆT ĐỐI KHÔNG dùng ký tự văn bản thô ASCII. BẮT BUỘC 100% sử dụng khối code ```mermaid. "
            "Gán icon Emoji (🔒, ⚙️, ⚡, 🏗️, 📊...) vào đầu nhãn node và bọc tên node trong ngoặc kép A[\"🔒 Tên Node\"].\n"
            "6. GỢI Ý TIẾP THEO: Kết thúc bằng đường phân cách '\\n\\n---\\n\\n' và mỗi gợi ý BẮT BUỘC nằm ở một dòng riêng bắt đầu bằng '- ' như sau:\n\n"
            "---\n\n"
            "### 💡 Gợi ý câu hỏi & bước tiếp theo:\n"
            "- Câu hỏi gợi ý 1 liên quan tới chủ đề trên\n"
            "- Câu hỏi gợi ý 2 mở rộng câu hỏi trên\n"
            "- Câu hỏi gợi ý 3 ứng dụng thực tế\n"
        )
    return (
        "Bạn là chuyên gia AI tri thức cao cấp UniChat.\n"
        "NGUYÊN TẮC SUY LUẬN (CHỈ DỰA TRÊN TÀI LIỆU NỘI BỘ):\n"
        "1. CHỈ sử dụng thông tin có trong các tài liệu được cung cấp dưới đây.\n"
        "2. Kèm số thứ tự trích dẫn [1], [2] cho mọi thông tin trích xuất.\n"
        "3. Trình bày sắc nét, cấu trúc bài bản, mạch lạc.\n"
        "4. GỢI Ý TIẾP THEO: Cuối câu trả lời BẮT BUỘC tạo phân cách '---\\n\\n### 💡 Gợi ý câu hỏi & bước tiếp theo:' kèm 3 gợi ý dạng '- '."
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

    # Real-time RAG Pipeline Execution Thought Events
    yield format_sse("thought", {
        "stepIndex": 1,
        "stepKey": "INTENT",
        "title": "Initiating Request & Intent Analysis",
        "detail": f"Đã phân tích ý định (Phân loại: {intent}), bóc tách từ khóa chuyên môn và khoanh vùng phạm vi tri thức RAG.",
    })

    yield format_sse("thought", {
        "stepIndex": 2,
        "stepKey": "RETRIEVAL",
        "title": "Retrieving & Grounding Sources",
        "detail": f"Đã quét kho tài liệu Vector DB, bóc tách thành công {len(citations)} trích dẫn tri thức có điểm tương đồng cao nhất.",
    })

    yield format_sse("thought", {
        "stepIndex": 3,
        "stepKey": "SYNTHESIS",
        "title": "Synthesizing Key Concepts",
        "detail": f"Đang hợp nhất {len(candidates)} khối bằng chứng trích dẫn và truyền sang Gemini LLM để tổng hợp bài viết chuyên sâu...",
    })

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
    metadata_sent = False
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

                for chunk in stream:
                    if not metadata_sent:
                        yield format_sse("thought", {
                            "stepIndex": 4,
                            "stepKey": "GENERATION",
                            "title": "Verifying Citations & Formatting Output",
                            "detail": f"Đã xác thực trích dẫn [1], [2], đang stream trực tiếp câu trả lời và định dạng sơ đồ Mermaid...",
                        })
                        yield format_sse("metadata", {
                            "decision": "ANSWER",
                            "intent": intent,
                            "strategyVersion": strategy_version,
                            "citations": citations,
                            "evidenceScore": evidence_score,
                            "providerModel": used_model_name,
                            "requestId": request_id,
                        })
                        metadata_sent = True

                    if chunk.text:
                        yield format_sse("token", {"delta": chunk.text})

                success_stream = True
                break

            except Exception as e:
                logger.warning(
                    "Gemini SSE streaming Key #%d, Model '%s' error: %s. Trying next...",
                    k_idx, model, e
                )
                if metadata_sent:
                    break

    if success_stream:
        yield format_sse("done", {
            "messageId": request_id,
            "refusalCode": None,
            "providerModel": used_model_name,
        })
    else:
        logger.error("All Gemini streaming candidates failed.")
        if not metadata_sent:
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
