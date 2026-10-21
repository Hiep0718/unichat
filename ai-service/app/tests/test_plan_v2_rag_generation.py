"""Offline provenance, evidence and complete output validation regressions."""

import json
from typing import Any
from unittest.mock import patch

import pytest
from pydantic import ValidationError

from app.core.rag.answer_pipeline import complete_answer, prepare_answer
from app.core.rag.citation_validator import (
    EXTERNAL_LABEL,
    is_valid_locator,
    render_answer,
    validate_generated_answer,
)
from app.core.rag.contracts import RetrievalAnswerRequest
from app.core.rag.conversation_memory import CompactionOutputInvalid
from app.core.rag.llm_provider import generate_rag_answer
from app.core.rag.provider_gateway import ProviderResult
from app.core.rag.source_validation import SourceValidationError, build_citations
from app.tests.plan_v2_fixtures import (
    DOCUMENT_ID,
    candidate,
    generated,
    payload,
    policy,
    source,
)


@pytest.mark.parametrize("changes,code", [
    ({"cloudAllowed": False}, "CLOUD_POLICY_DENIED"),
    ({"cloudAllowed": None}, "OPERATION_POLICY_REQUIRED"),
    ({"operationId": None}, "OPERATION_POLICY_REQUIRED"),
    ({"permissionVersion": None}, "OPERATION_POLICY_REQUIRED"),
    ({"allowedDocumentIds": []}, "NO_ALLOWED_DOCUMENTS"),
    ({"sources": []}, "SOURCE_METADATA_INVALID"),
])
def test_should_refuse_missing_policy_or_sources_without_ai(changes: dict[str, Any], code: str) -> None:
    request = RetrievalAnswerRequest.model_validate(payload(**changes))
    with patch("app.core.rag.answer_pipeline.retrieve_chunks") as retrieval:
        with patch("app.core.rag.answer_pipeline.generate_rag_answer") as generator:
            result = complete_answer(prepare_answer(request))
    assert result.decision == "REFUSE"
    assert result.refusalCode == code
    retrieval.assert_not_called()
    generator.assert_not_called()


@pytest.mark.parametrize("expanded", [False, True])
def test_should_gate_both_modes_without_evidence(expanded: bool) -> None:
    request = RetrievalAnswerRequest.model_validate(payload(allowExternalKnowledge=expanded))
    with patch("app.core.rag.answer_pipeline.retrieve_chunks", return_value=[]):
        with patch("app.core.rag.answer_pipeline.generate_rag_answer") as generator:
            result = complete_answer(prepare_answer(request))
    assert result.decision != "ANSWER"
    generator.assert_not_called()


@pytest.mark.parametrize("changes", [
    {"cloudAllowed": "true"}, {"allowExternalKnowledge": 1}, {"permissionVersion": True},
    {"workspaceId": "bad-id"}, {"question": "a"}, {"question": "a" * 2001},
    {"sources": [source().model_dump(mode="json") | {"ingestionVersion": "v2.0"}]},
    {"unknownField": "rejected"},
])
def test_should_validate_request_boundaries(changes: dict[str, Any]) -> None:
    with pytest.raises(ValidationError):
        RetrievalAnswerRequest.model_validate(payload(**changes))


@pytest.mark.parametrize("changes", [
    {"document_id": "different-document"}, {"chunk_id": ""}, {"text": ""},
    {"ingestion_version": None}, {"ingestion_version": 3},
    {"document_content_hash": "a" * 64}, {"content_hash": "fake-score-hash"},
    {"locator_value": "page:0"},
])
def test_should_reject_unverified_or_changed_source_before_model(changes: dict[str, Any]) -> None:
    with patch("app.core.rag.llm_provider.generate") as generator:
        result = generate_rag_answer("RAG là gì?", [candidate(**changes)],
                                     [DOCUMENT_ID], policy=policy(), sources=[source()])
    assert result["validationFailed"] is True
    generator.assert_not_called()


def test_should_use_actual_chunk_identity_hash_and_filename() -> None:
    citations = build_citations([candidate()], [source(fileName="Tài liệu số 11.pdf")],
                               [DOCUMENT_ID])
    assert citations[0].chunkId == "real-chunk-101"
    assert citations[0].contentHash == candidate().content_hash
    assert citations[0].fileName == "Tài liệu số 11.pdf"
    assert citations[0].ingestionVersion == 2
    with pytest.raises(SourceValidationError):
        build_citations([candidate()], [], [DOCUMENT_ID])


@pytest.mark.parametrize("locator,expected", [
    ("page:1", True), ("paragraph:11", True), ("table:1/row:2/cell:3", True),
    ("line:1-5", True), ("line:5-1", False), ("page:0", False), ("undefined", False),
])
def test_should_validate_pdf_docx_and_txt_locators(locator: str, expected: bool) -> None:
    assert is_valid_locator(locator) is expected


@pytest.mark.parametrize("expanded", [False, True])
def test_should_render_only_verified_document_claims_and_labeled_expansion(expanded: bool) -> None:
    citations = build_citations([candidate()], [source()], [DOCUMENT_ID])
    answer = validate_generated_answer(generated(expanded=expanded), citations, expanded)
    text = render_answer(answer)
    assert "[1]" in text
    assert (EXTERNAL_LABEL in text) is expanded
    assert answer.sections[0].content == "RAG dựa trên tài liệu. [1]"


@pytest.mark.parametrize("response", [
    {"sections": [{"type": "DOCUMENT", "claims": [{"text": "Uncited", "citationIds": []}]}]},
    {"sections": [{"type": "DOCUMENT", "claims": [{"text": "False [9]", "citationIds": ["1"]}]}]},
    {"sections": [{"type": "DOCUMENT", "content": "Hidden factual prose",
                   "claims": [{"text": "Claim", "citationIds": ["1"]}]}]},
    {"sections": [{"type": "EXTERNAL", "claims": [{"text": "Only external", "citationIds": []}]}]},
])
def test_should_reject_uncited_extra_or_false_document_content(response: dict[str, Any]) -> None:
    citations = build_citations([candidate()], [source()], [DOCUMENT_ID])
    with pytest.raises(ValueError):
        validate_generated_answer(json.dumps(response), citations, True)


def test_should_reject_external_section_in_strict_mode_and_fake_external_reference() -> None:
    citations = build_citations([candidate()], [source()], [DOCUMENT_ID])
    with pytest.raises(ValueError):
        validate_generated_answer(generated(expanded=True), citations, False)
    response = json.loads(generated(expanded=True))
    response["sections"][1]["claims"][0]["citationIds"] = ["1"]
    with pytest.raises(ValueError):
        validate_generated_answer(json.dumps(response), citations, True)


def test_should_retry_invalid_output_once_and_clear_provisional_attempt() -> None:
    events = []
    responses = [ProviderResult(generated(reference="9"), "gemini", "test", "primary"),
                 ProviderResult(generated(), "gemini", "test", "primary")]
    with patch("app.core.rag.llm_provider.generate", side_effect=responses) as generator:
        result = generate_rag_answer("RAG là gì?", [candidate()], [DOCUMENT_ID],
                                     policy=policy(), sources=[source()],
                                     observer=lambda kind, data: events.append((kind, data)))
    assert generator.call_count == 2
    assert result["validationFailed"] is False
    assert events == [("reset", {"reason": "CITATION_VALIDATION_RETRY"})]
    assert generator.call_args.args[0].count("real-chunk") == 0


def test_should_refuse_after_second_invalid_output_without_third_attempt() -> None:
    response = ProviderResult("invalid json", "gemini", "test", "primary")
    with patch("app.core.rag.llm_provider.generate", return_value=response) as generator:
        result = generate_rag_answer("RAG là gì?", [candidate()], [DOCUMENT_ID],
                                     policy=policy(), sources=[source()])
    assert generator.call_count == 2
    assert result["refusalCode"] == "CITATION_VALIDATION_FAILED"
    assert result["answer"] is None


def test_should_preserve_answer_when_compaction_provider_fails() -> None:
    history = [{"role": "user", "content": "x" * 1000}] * 20
    response = ProviderResult(generated(), "gemini", "test", "primary")
    with patch("app.core.rag.llm_provider.compact_conversation", side_effect=CompactionOutputInvalid("bad")):
        with patch("app.core.rag.llm_provider.generate", return_value=response):
            result = generate_rag_answer("RAG là gì?", [candidate()], [DOCUMENT_ID],
                                         conversation_history=history, policy=policy(),
                                         sources=[source()])
    assert result["validationFailed"] is False
    assert "compactedSummary" not in result
