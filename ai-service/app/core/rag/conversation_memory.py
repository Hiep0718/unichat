"""Conversation memory and context window compaction module.

Manages conversation context construction, token estimation, and LLM-driven
compaction when history approaches the conversation token budget limit.
"""

import asyncio
import logging
from typing import Optional

from pydantic import BaseModel, Field

logger = logging.getLogger(__name__)

CONVERSATION_TOKEN_BUDGET: int = 8_500
COMPACTION_THRESHOLD: float = 0.8
MAX_ASSISTANT_CONTENT_CHARS: int = 1_200

COMPACTION_PROMPT_TEMPLATE: str = (
    "Hãy tóm tắt cuộc hội thoại sau thành một đoạn văn ngắn gọn (tối đa 500 từ) bằng tiếng Việt.\n"
    "Giữ lại các thông tin quan trọng: chủ đề chính, các khái niệm đã thảo luận, kết luận và quyết định.\n"
    "Đặc biệt giữ lại ngữ cảnh cần thiết để hiểu các đại từ (nó, cái đó, v.v.) trong câu hỏi tiếp theo.\n"
    "Không thêm thông tin mới. Không dùng format đặc biệt.\n\n"
    "{existing_summary}\n\n"
    "{messages_to_compact}"
)


class ConversationMessage(BaseModel):
    """Represents a single message in conversation history."""
    role: str
    content: str


class ConversationContext(BaseModel):
    """Encapsulates existing summary and recent raw messages."""
    summary: Optional[str] = None
    recent_messages: list[ConversationMessage] = Field(default_factory=list)


def estimate_token_count(text: str) -> int:
    """Estimates token count for Vietnamese mixed text using ~2 chars/token ratio."""
    if not text:
        return 0
    return max(1, len(text) // 2)


def truncate_assistant_content(content: str, max_chars: int = MAX_ASSISTANT_CONTENT_CHARS) -> str:
    """Truncates assistant message content by removing suggestion section and limiting length."""
    if not content:
        return ""
    truncated = content
    separator_idx = truncated.rfind("\n---\n")
    if separator_idx > 0:
        truncated = truncated[:separator_idx].rstrip()
    if len(truncated) > max_chars:
        truncated = truncated[:max_chars] + "..."
    return truncated


def build_conversation_prompt(
    context: ConversationContext,
    max_tokens: int = CONVERSATION_TOKEN_BUDGET,
) -> str:
    """Formats conversation summary and recent messages into prompt section.

    Respects the max_tokens budget, prioritizing summary and newest messages.
    """
    if not context.summary and not context.recent_messages:
        return ""

    lines: list[str] = ["--- LỊCH SỬ HỘI THOẠI ---"]

    if context.summary and context.summary.strip():
        lines.append(f"[Tóm tắt cuộc trò chuyện trước đó]:\n{context.summary.strip()}")

    if context.recent_messages:
        lines.append("[Tin nhắn gần đây]:")
        for msg in context.recent_messages:
            role_label = "USER" if msg.role.upper() == "USER" else "ASSISTANT"
            content = (
                truncate_assistant_content(msg.content)
                if role_label == "ASSISTANT"
                else msg.content
            )
            lines.append(f"{role_label}: {content}")

    prompt_text = "\n\n".join(lines)
    tokens = estimate_token_count(prompt_text)
    if tokens > max_tokens and context.recent_messages:
        logger.info(
            "Conversation prompt tokens (%d) exceeded budget (%d), compaction advised.",
            tokens,
            max_tokens,
        )
    return prompt_text


def check_compaction_needed(context: ConversationContext) -> bool:
    """Checks whether conversation context tokens exceed the compaction threshold."""
    total_chars = 0
    if context.summary:
        total_chars += len(context.summary)
    for msg in context.recent_messages:
        total_chars += len(msg.content)

    estimated_tokens = estimate_token_count("x" * total_chars)
    threshold_tokens = int(CONVERSATION_TOKEN_BUDGET * COMPACTION_THRESHOLD)
    return estimated_tokens >= threshold_tokens


def _format_messages_for_compaction(
    messages: list[ConversationMessage],
    existing_summary: Optional[str] = None,
) -> str:
    """Constructs the compaction prompt from messages and existing summary."""
    summary_part = (
        f"[Tóm tắt trước đó]:\n{existing_summary.strip()}"
        if existing_summary and existing_summary.strip()
        else ""
    )
    msg_lines = []
    for m in messages:
        content = truncate_assistant_content(m.content) if m.role.upper() == "ASSISTANT" else m.content
        msg_lines.append(f"{m.role.upper()}: {content}")
    messages_part = "\n".join(msg_lines)

    return COMPACTION_PROMPT_TEMPLATE.format(
        existing_summary=summary_part,
        messages_to_compact=messages_part,
    )


def compact_conversation(
    messages: list[ConversationMessage],
    existing_summary: Optional[str] = None,
) -> str:
    """Synchronously summarizes messages into a concise Vietnamese summary."""
    if not messages:
        return existing_summary or ""

    from app.core.rag.llm_provider import (
        get_candidate_gemini_models,
        get_gemini_api_keys,
    )

    prompt = _format_messages_for_compaction(messages, existing_summary)
    gemini_keys = get_gemini_api_keys()
    candidate_models = get_candidate_gemini_models()

    if gemini_keys:
        try:
            from google import genai
            from google.genai import types

            for key in gemini_keys:
                client = genai.Client(api_key=key)
                for model_name in candidate_models:
                    try:
                        response = client.models.generate_content(
                            model=model_name,
                            contents=prompt,
                            config=types.GenerateContentConfig(
                                temperature=0.2,
                                max_output_tokens=1000,
                            ),
                        )
                        if response.text and response.text.strip():
                            return response.text.strip()
                    except Exception as err:
                        logger.warning("Compaction with model %s failed: %s", model_name, err)
                        continue
        except Exception as e:
            logger.error("Error during LLM conversation compaction: %s", e)

    # Fallback if LLM unavailable: concatenate bullet points
    parts = []
    if existing_summary:
        parts.append(existing_summary)
    for m in messages[-4:]:
        role = "Người dùng" if m.role.upper() == "USER" else "Trợ lý"
        parts.append(f"- {role}: {m.content[:150]}")
    return "\n".join(parts)


async def acompact_conversation(
    messages: list[ConversationMessage],
    existing_summary: Optional[str] = None,
) -> str:
    """Asynchronously summarizes messages into a concise Vietnamese summary."""
    return await asyncio.to_thread(compact_conversation, messages, existing_summary)
