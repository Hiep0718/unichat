"""Shared prompt building utilities for RAG answering (NotebookLM style).

Used by both stream_provider and llm_provider to eliminate prompt duplication.
"""

from typing import Optional


def build_system_prompt(allow_external_knowledge: bool = True) -> str:
    """Build system prompt for NotebookLM-grade RAG answer generation.

    Args:
        allow_external_knowledge: When True, allows AI synthesis with external knowledge
            grounded by citations. When False, restricts strictly to provided documents.

    Returns:
        Structured system prompt string with guidance, formatting, and suggestion rules.
    """
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
            "   - Phân tích sâu ĐIỀU KIỆN, NGUYÊN NHÂN, TÁC ĐỘNG và HỆ QUẢ (ví dụ: Bảo mật dữ liệu qua Encapsulation/Validation, KhẢ năng bảo trì qua Loose Coupling/Implementation Hiding).\n"
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


def build_rag_prompt(
    system_prompt: str,
    context_str: str,
    question: str,
    conversation_prompt: Optional[str] = None,
) -> str:
    """Builds the full prompt combining system prompt, optional conversation history,

    retrieved document context, and user question.
    """
    sections = [system_prompt]
    if conversation_prompt and conversation_prompt.strip():
        sections.append(conversation_prompt.strip())
    sections.append(f"--- TÀI LIỆU KHỞI THỦY ---\n{context_str}")
    sections.append(f"CÂU HỎI: {question}")
    return "\n\n".join(sections)
