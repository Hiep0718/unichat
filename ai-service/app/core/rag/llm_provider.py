import logging
import os
from typing import Any

from google import genai
from google.genai import types
import httpx

from app.core.rag.citation_validator import validate_citations
from app.core.rag.conversation_memory import (
    ConversationContext,
    ConversationMessage,
    build_conversation_prompt,
    check_compaction_needed,
    compact_conversation,
)
from app.core.rag.prompt_builder import build_system_prompt
from app.core.rag.retrieval_engine import RetrievedChunkCandidate

logger = logging.getLogger(__name__)

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "")
GEMINI_MODEL = os.getenv("GEMINI_MODEL", "gemini-2.5-flash")
OLLAMA_HOST = os.getenv("OLLAMA_HOST", "http://localhost:11434")
ENABLE_OLLAMA_FALLBACK = os.getenv("ENABLE_OLLAMA_FALLBACK", "false").lower() == "true"


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

    # 2. Backup candidate models (verified active project models)
    backups = [
        "gemini-3.5-flash",
        "gemini-3.5-flash-lite",
        "gemini-3.8-flash",
        "gemini-2.5-flash",
        "gemini-flash-latest",
        "gemini-flash-lite-latest",
    ]
    for b in backups:
        if b not in models:
            models.append(b)

    return models


MAX_SINGLE_CHUNK_CHARS = 3_000
"""Safety cap per chunk to prevent wasted Gemini tokens on oversized V1/TABLE chunks."""


def generate_rag_answer(
    question: str,
    candidates: list[RetrievedChunkCandidate],
    allowed_document_ids: list[str] | None = None,
    allow_external_knowledge: bool = True,
    conversation_history: list[dict[str, str]] | None = None,
    conversation_summary: str | None = None,
    single_source_warning: bool = False,
) -> dict[str, Any]:
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
        logger.warning("Citation validation failed for retrieved candidates.")
        return {
            "answer": None,
            "citations": [],
            "provider": "rejected-citations",
            "validationFailed": True,
        }

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
            try:
                compacted_summary = compact_conversation(
                    conv_messages,
                    existing_summary=conversation_summary,
                )
                conv_context.summary = compacted_summary
                conv_context.recent_messages = conv_messages[-4:]
            except Exception as comp_err:
                logger.warning("Compaction failed in llm_provider: %s", comp_err)

        conversation_prompt = build_conversation_prompt(conv_context)

    context_str = "\n\n".join(context_blocks)
    base_system_prompt = build_system_prompt(
        allow_external_knowledge, single_source_warning=single_source_warning
    )

    sections = [base_system_prompt]
    if conversation_prompt and conversation_prompt.strip():
        sections.append(conversation_prompt.strip())
    sections.append(f"--- TÀI LIỆU KHỞI THỦY ---\n{context_str}")
    system_prompt = "\n\n".join(sections)

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
                    res_payload: dict[str, Any] = {
                        "answer": answer,
                        "citations": citations,
                        "provider": used_model,
                    }
                    if compacted_summary:
                        res_payload["compactedSummary"] = compacted_summary
                    return res_payload
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
            ollama_res: dict[str, Any] = {
                "answer": answer,
                "citations": citations,
                "provider": "ollama-local",
            }
            if compacted_summary:
                ollama_res["compactedSummary"] = compacted_summary
            return ollama_res
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
    model_name = target_model or os.getenv("GEMINI_MODEL") or "gemini-3.5-flash"

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
