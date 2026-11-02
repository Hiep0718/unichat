from app.core.rag.prompt_builder import build_system_prompt


def test_should_request_source_backed_mermaid_when_user_asks_for_diagram() -> None:
    prompt = build_system_prompt()

    assert "```mermaid" in prompt
    assert "chỉ vẽ thành phần và liên kết có bằng chứng" in prompt
    assert "Emoji" in prompt


def test_should_require_complete_document_answers_without_external_knowledge() -> None:
    prompt = build_system_prompt()

    assert "ngôn ngữ người dùng sử dụng" in prompt
    assert "Bao quát từng phần câu hỏi" in prompt
    assert "Không chỉ liệt kê tên chương, tiêu đề, số slide" in prompt
    assert "Citation là bằng chứng cho câu trả lời, không thay thế phần giải thích" in prompt
    assert "Với mỗi claim DOCUMENT" in prompt
    assert "STRICT không dùng kiến thức ngoài tài liệu" in prompt
    assert "hãy nói rõ giới hạn đó" in prompt
    assert "CHỈ sử dụng thông tin có trong tài liệu" in prompt
    assert "Không được tạo section EXTERNAL" in prompt


def test_should_keep_expanded_knowledge_separate_from_document_answers() -> None:
    prompt = build_system_prompt(allow_external_knowledge=True)

    assert "Bao quát từng phần câu hỏi" in prompt
    assert "BẮT BUỘC có ít nhất một section DOCUMENT và một section EXTERNAL riêng" in prompt
    assert "không dùng nó để lấp thiếu hụt bằng chứng" in prompt


def test_should_include_notebooklm_grade_presentation_rules() -> None:
    prompt = build_system_prompt()

    assert "NotebookLM" in prompt
    assert "CẤU TRÚC BÀI VIẾT BÀI BẢN & CHI TIẾT" in prompt
    assert "KaTeX" in prompt
    assert "Gợi ý câu hỏi & bước tiếp theo" in prompt
    assert "### 1." in prompt
