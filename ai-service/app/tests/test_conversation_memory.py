"""Unit tests for conversation_memory module and CLARIFY bypass logic."""

import pytest

from app.core.rag.conversation_memory import (
    CONVERSATION_TOKEN_BUDGET,
    ConversationContext,
    ConversationMessage,
    build_conversation_prompt,
    check_compaction_needed,
    compact_conversation,
    estimate_token_count,
    truncate_assistant_content,
)
from app.core.rag.intent_detector import IntentEnum, detect_intent
from app.core.rag.prompt_builder import build_rag_prompt, build_system_prompt


def test_estimate_token_count():
    assert estimate_token_count("") == 0
    assert estimate_token_count("Hello") == 2
    # Vietnamese text ratio ~2 chars/token
    vn_text = "Học máy và xử lý ngôn ngữ tự nhiên"
    expected = len(vn_text) // 2
    assert estimate_token_count(vn_text) == expected


def test_truncate_assistant_content():
    assert truncate_assistant_content("") == ""

    # Should keep short content as is
    short_content = "Đây là câu trả lời ngắn."
    assert truncate_assistant_content(short_content) == short_content

    # Should strip suggestion section after \n---\n
    with_suggestions = (
        "Nội dung chính của câu trả lời.\n---\n### 💡 Gợi ý câu hỏi:\n- Gợi ý 1\n- Gợi ý 2"
    )
    truncated = truncate_assistant_content(with_suggestions)
    assert "Gợi ý câu hỏi" not in truncated
    assert truncated == "Nội dung chính của câu trả lời."

    # Should truncate oversized text to 1200 chars + ...
    long_text = "a" * 1500
    res = truncate_assistant_content(long_text, max_chars=1200)
    assert len(res) == 1203  # 1200 + '...'
    assert res.endswith("...")


def test_build_conversation_prompt():
    # Empty context
    empty_ctx = ConversationContext()
    assert build_conversation_prompt(empty_ctx) == ""

    # Summary only
    summary_ctx = ConversationContext(summary="Cuộc trò chuyện về lập trình Java.")
    prompt = build_conversation_prompt(summary_ctx)
    assert "--- LỊCH SỬ HỘI THOẠI ---" in prompt
    assert "[Tóm tắt cuộc trò chuyện trước đó]:" in prompt
    assert "Cuộc trò chuyện về lập trình Java." in prompt

    # Recent messages
    msg_ctx = ConversationContext(
        recent_messages=[
            ConversationMessage(role="user", content="OOP là gì?"),
            ConversationMessage(role="assistant", content="OOP là lập trình hướng đối tượng.\n---\n- Gợi ý"),
        ]
    )
    prompt2 = build_conversation_prompt(msg_ctx)
    assert "USER: OOP là gì?" in prompt2
    assert "ASSISTANT: OOP là lập trình hướng đối tượng." in prompt2
    assert "- Gợi ý" not in prompt2


def test_check_compaction_needed():
    # Short conversation does not need compaction
    short_ctx = ConversationContext(
        recent_messages=[
            ConversationMessage(role="user", content="Câu hỏi ngắn"),
            ConversationMessage(role="assistant", content="Câu trả lời ngắn"),
        ]
    )
    assert check_compaction_needed(short_ctx) is False

    # Long conversation exceeding 80% threshold needs compaction
    # 8500 * 0.8 = 6800 tokens -> ~13600 chars
    long_ctx = ConversationContext(
        recent_messages=[
            ConversationMessage(role="user", content="x" * 7000),
            ConversationMessage(role="assistant", content="y" * 7000),
        ]
    )
    assert check_compaction_needed(long_ctx) is True


def test_compact_conversation_fallback_without_keys(monkeypatch):
    # Ensure no Gemini keys
    monkeypatch.setenv("GEMINI_API_KEY", "")
    monkeypatch.setenv("GEMINI_API_KEYS", "")
    monkeypatch.setenv("GEMINI_API_KEY_2", "")

    messages = [
        ConversationMessage(role="user", content="Khái niệm Vector Embedding"),
        ConversationMessage(role="assistant", content="Vector Embedding là biểu diễn vector"),
    ]
    summary = compact_conversation(messages, existing_summary="Tóm tắt trước")
    assert "Tóm tắt trước" in summary
    assert "Khái niệm Vector Embedding" in summary


def test_prompt_builder_shared_functions():
    # Test build_system_prompt
    sys_prompt_ext = build_system_prompt(allow_external_knowledge=True)
    assert "chuyên gia AI tri thức cao cấp UniChat" in sys_prompt_ext
    assert "NotebookLM" in sys_prompt_ext

    sys_prompt_strict = build_system_prompt(allow_external_knowledge=False)
    assert "CHỈ THEO TÀI LIỆU" in sys_prompt_strict or "CHỈ sử dụng thông tin" in sys_prompt_strict

    # Test build_rag_prompt
    full = build_rag_prompt("SYSTEM", "CHUNK_1", "QUESTION", "HISTORY_PROMPT")
    assert "SYSTEM" in full
    assert "HISTORY_PROMPT" in full
    assert "--- TÀI LIỆU KHỞI THỦY ---\nCHUNK_1" in full
    assert "CÂU HỎI: QUESTION" in full


def test_intent_detector_clarify_bypass():
    question = "cái đó là gì"

    # Without conversation context: must trigger CLARIFY
    result_no_context = detect_intent(question, has_conversation_context=False)
    assert result_no_context.intent == IntentEnum.CLARIFY
    assert result_no_context.rule_id == "RULE_AMBIGUOUS_PRONOUN"

    # With conversation context: bypasses ambiguous pronoun check, falls back to DEFINITION / FACT
    result_with_context = detect_intent(question, has_conversation_context=True)
    assert result_with_context.intent != IntentEnum.CLARIFY
