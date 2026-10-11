"""Source-validated generation with exactly one output-validation retry."""

import logging
from typing import Any

from app.core.rag.citation_validator import render_answer, validate_generated_answer
from app.core.rag.contracts import CitationItem, GeneratedAnswer, SourceVersion
from app.core.rag.conversation_memory import (
    ConversationContext,
    ConversationMessage,
    build_conversation_prompt,
    check_compaction_needed,
    compact_conversation,
)
from app.core.rag.generation_policy import GenerationPolicy, GenerationPolicyError
from app.core.rag.key_registry import configured_keys, configured_model
from app.core.rag.prompt_builder import build_rag_prompt, build_system_prompt
from app.core.rag.provider_gateway import AttemptBudget, Observer, ProviderFailure, generate
from app.core.rag.retrieval_engine import RetrievedChunkCandidate
from app.core.rag.source_validation import SourceValidationError, build_citations
from app.core.service_security import ServiceSecurityError

logger = logging.getLogger(__name__)
MAX_SINGLE_CHUNK_CHARS = 3000


def get_gemini_api_keys() -> list[str]:
    """Compatibility facade backed by the unified deterministic key registry."""
    return [key.secret for key in configured_keys()]


def get_candidate_gemini_models() -> list[str]:
    """One configured model; no guessing backup model names."""
    return [configured_model()]


def generate_rag_answer(
    question: str,
    candidates: list[RetrievedChunkCandidate],
    allowed_document_ids: list[str] | None = None,
    allow_external_knowledge: bool = False,
    conversation_history: list[dict[str, str]] | None = None,
    conversation_summary: str | None = None,
    single_source_warning: bool = False,
    policy: GenerationPolicy | None = None,
    sources: list[SourceVersion] | None = None,
    observer: Observer | None = None,
) -> dict[str, Any]:
    """Generate only with explicit Core policy and authenticated source metadata."""
    if policy is None or not policy.cloud_allowed:
        return _refusal("OPERATION_POLICY_REQUIRED" if policy is None else "CLOUD_POLICY_DENIED")
    try:
        citations = build_citations(candidates, sources or [], allowed_document_ids or [])
        prompt, summary = _prepare_prompt(
            question,
            candidates,
            allow_external_knowledge,
            conversation_history,
            conversation_summary,
            single_source_warning,
            policy,
        )
        result = _validated_generation(
            prompt, citations, allow_external_knowledge, policy, observer
        )
        if summary:
            result["compactedSummary"] = summary
        return result
    except (SourceValidationError, ServiceSecurityError) as error:
        return _refusal(str(error))
    except ProviderFailure as error:
        return _refusal(error.code)


def _prepare_prompt(
    question: str,
    candidates: list[RetrievedChunkCandidate],
    expanded: bool,
    history: list[dict[str, str]] | None,
    summary: str | None,
    warning: bool,
    policy: GenerationPolicy,
) -> tuple[str, str | None]:
    messages = [ConversationMessage(**message) for message in history or []][-20:]
    context = ConversationContext(summary=summary, recent_messages=messages)
    compacted = None
    if check_compaction_needed(context):
        try:
            compacted = compact_conversation(messages[:-4], summary, policy)
            context = ConversationContext(summary=compacted, recent_messages=messages[-4:])
        except (ProviderFailure, ValueError) as error:
            logger.warning(
                "compaction_failed code=%s request_id=%s", type(error).__name__, policy.request_id
            )
    blocks = [
        f"[{index}] {candidate.document_id} {candidate.locator_value}:\n"
        f"{candidate.text[:MAX_SINGLE_CHUNK_CHARS]}"
        for index, candidate in enumerate(candidates, start=1)
    ]
    prompt = build_rag_prompt(
        build_system_prompt(expanded, warning),
        "\n\n".join(blocks),
        question,
        build_conversation_prompt(context),
    )
    return prompt, compacted


def _validated_generation(
    prompt: str,
    citations: list[CitationItem],
    expanded: bool,
    policy: GenerationPolicy,
    observer: Observer | None,
) -> dict[str, Any]:
    budget = AttemptBudget()
    for retry in range(2):
        if retry and observer:
            observer("reset", {"reason": "CITATION_VALIDATION_RETRY"})
        result = generate(
            prompt,
            policy,
            observer=observer,
            schema=GeneratedAnswer.model_json_schema(),
            budget=budget,
        )
        try:
            parsed = validate_generated_answer(result.text, citations, expanded)
        except ValueError:
            if retry:
                return _refusal("CITATION_VALIDATION_FAILED")
            prompt += (
                "\nOUTPUT trước không đúng schema/citation. "
                "Sinh lại với cùng nguồn, không thêm nguồn."
            )
            continue
        referenced = {
            reference
            for section in parsed.sections
            for claim in section.claims
            for reference in claim.citationIds
        }
        return {
            "answer": render_answer(parsed),
            "sections": [section.model_dump() for section in parsed.sections],
            "citations": [
                citation.model_dump() for citation in citations if citation.citationId in referenced
            ],
            "provider": result.model,
            "knowledgeMode": "EXPANDED" if expanded else "STRICT",
            "validationFailed": False,
        }
    return _refusal("CITATION_VALIDATION_FAILED")


def _refusal(code: str) -> dict[str, Any]:
    return {
        "answer": None,
        "citations": [],
        "sections": [],
        "provider": "none",
        "validationFailed": True,
        "refusalCode": code,
    }


def call_gemini_api(
    system_prompt: str,
    question: str,
    api_key: str | None = None,
    target_model: str | None = None,
    policy: GenerationPolicy | None = None,
) -> tuple[str, str]:
    """Legacy evaluation facade stays fail closed unless an authorized policy is provided."""
    if policy is None:
        raise GenerationPolicyError("OPERATION_POLICY_REQUIRED")
    key = (
        next((item for item in configured_keys() if item.secret == api_key), None)
        if api_key
        else None
    )
    if api_key and key is None:
        raise ProviderFailure("PROVIDER_KEY_UNKNOWN")
    result = generate(f"{system_prompt}\n{question}", policy, selected_key=key, model=target_model)
    return result.text, result.model
