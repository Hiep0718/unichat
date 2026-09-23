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
from app.core.rag.conversation_memory import (
    ConversationContext,
    ConversationMessage,
    acompact_conversation,
    build_conversation_prompt,
    check_compaction_needed,
)
from app.core.rag.llm_provider import (
    MAX_SINGLE_CHUNK_CHARS,
    get_candidate_gemini_models,
    get_gemini_api_keys,
)
from app.core.rag.prompt_builder import build_rag_prompt, build_system_prompt
from app.core.rag.retrieval_engine import RetrievedChunkCandidate

logger = logging.getLogger(__name__)


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
    conversation_history: list[dict[str, str]] | None = None,
    conversation_summary: str | None = None,
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

    # 1. Real-time RAG Pipeline Execution Thought Events (Initial steps)
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

    compacted_summary: str | None = None
    conversation_prompt: str | None = None

    if conversation_history or conversation_summary:
        raw_messages = [
            ConversationMessage(role=m.get("role", "user"), content=m.get("content", ""))
            for m in (conversation_history or [])
            if m.get("content")
        ]
        # When summary already exists, keep most recent turns as uncompacted window
        conv_messages = raw_messages[-10:] if conversation_summary else raw_messages
        conv_context = ConversationContext(
            summary=conversation_summary,
            recent_messages=conv_messages,
        )

        if check_compaction_needed(conv_context):
            yield format_sse("thought", {
                "stepIndex": 3,
                "stepKey": "COMPACTION",
                "title": "Compacting Conversation Context",
                "detail": "Đang tóm tắt lịch sử hội thoại để tối ưu ngữ cảnh...",
            })
            try:
                compacted_summary = await acompact_conversation(
                    conv_messages,
                    existing_summary=conversation_summary,
                )
                conv_context.summary = compacted_summary
                conv_context.recent_messages = conv_messages[-4:]
            except Exception as comp_err:
                logger.warning("Compaction failed in streaming provider: %s", comp_err)

        conversation_prompt = build_conversation_prompt(conv_context)

    context_str = "\n\n".join(context_blocks)
    system_prompt = build_system_prompt(allow_external_knowledge)
    full_prompt = build_rag_prompt(system_prompt, context_str, question, conversation_prompt)

    yield format_sse("thought", {
        "stepIndex": 4 if compacted_summary else 3,
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
                            "stepIndex": 5 if compacted_summary else 4,
                            "stepKey": "GENERATION",
                            "title": "Verifying Citations & Formatting Output",
                            "detail": f"Đã xác thực trích dẫn [1], [2], đang stream trực tiếp câu trả lời và định dạng sơ đồ Mermaid...",
                        })
                        meta_payload: dict[str, Any] = {
                            "decision": "ANSWER",
                            "intent": intent,
                            "strategyVersion": strategy_version,
                            "citations": citations,
                            "evidenceScore": evidence_score,
                            "providerModel": used_model_name,
                            "requestId": request_id,
                        }
                        if compacted_summary:
                            meta_payload["compactedSummary"] = compacted_summary
                        yield format_sse("metadata", meta_payload)
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
