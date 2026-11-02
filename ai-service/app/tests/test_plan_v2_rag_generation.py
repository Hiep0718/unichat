"""Offline provenance, evidence and complete output validation regressions."""

import hashlib
import json
from collections.abc import Iterator
from typing import Any
from unittest.mock import MagicMock, patch

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
    DOCUMENT_HASH,
    DOCUMENT_ID,
    WORKSPACE_ID,
    candidate,
    fallback_planning_result,
    generated,
    payload,
    policy,
    retrieved_evidence,
    source,
)

TITLE_TEXT = "Architecture Characteristics Defined"
DEFINITION_TEXT = (
    "Architecture characteristics are the non-domain design considerations "
    "that describe a system's operational and structural qualities."
)


def _definition_retrieval_dependencies(include_definition: bool) -> tuple[MagicMock, MagicMock]:
    texts = [TITLE_TEXT, DEFINITION_TEXT] if include_definition else [TITLE_TEXT]
    locators = ["slide:4", "slide:5"] if include_definition else ["slide:4"]
    metadatas = [
        {
            "workspace_id": WORKSPACE_ID,
            "document_id": DOCUMENT_ID,
            "document_status": "PROCESSED",
            "locator_type": "SLIDE_NUMBER",
            "locator_value": locator,
            "content_hash": hashlib.sha256(text.encode("utf-8")).hexdigest(),
            "ingestion_version": 2,
            "document_content_hash": DOCUMENT_HASH,
            "section_heading": TITLE_TEXT,
        }
        for text, locator in zip(texts, locators, strict=True)
    ]
    collection = MagicMock()
    collection.query.return_value = {
        "ids": [["title-chunk", "definition-chunk"][: len(texts)]],
        "documents": [texts],
        "distances": [[0.05, 0.08][: len(texts)]],
        "metadatas": [metadatas],
    }
    chroma_client = MagicMock()
    chroma_client.get_collection.return_value = collection
    embedding_model = MagicMock()
    embedding_model.encode.return_value.tolist.return_value = [[1.0]]
    return chroma_client, embedding_model


@pytest.fixture(autouse=True)
def mock_question_planner() -> Iterator[None]:
    with patch(
        "app.core.rag.answer_pipeline.plan_question",
        side_effect=lambda question, *_: fallback_planning_result(question),
    ):
        yield


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
    with patch("app.core.rag.answer_pipeline.retrieve_planned_evidence") as retrieval:
        with patch("app.core.rag.answer_pipeline.generate_rag_answer") as generator:
            result = complete_answer(prepare_answer(request))
    assert result.decision == "REFUSE"
    assert result.refusalCode == code
    retrieval.assert_not_called()
    generator.assert_not_called()


@pytest.mark.parametrize("expanded", [False, True])
def test_should_gate_both_modes_without_evidence(expanded: bool) -> None:
    request = RetrievalAnswerRequest.model_validate(payload(allowExternalKnowledge=expanded))
    with patch(
        "app.core.rag.answer_pipeline.retrieve_planned_evidence",
        return_value=retrieved_evidence(),
    ):
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


def test_should_reorder_expanded_suggestions_after_external_section() -> None:
    citations = build_citations([candidate()], [source()], [DOCUMENT_ID])
    raw = json.dumps({
        "sections": [
            {
                "type": "DOCUMENT",
                "claims": [
                    {"text": "Nội dung tài liệu.", "citationIds": ["1"]},
                    {"text": "---\n\n### 💡 Gợi ý câu hỏi & bước tiếp theo:\n- Gợi ý 1 [1]", "citationIds": ["1"]},
                ],
            },
            {
                "type": "EXTERNAL",
                "claims": [
                    {"text": "Kiến thức mở rộng bổ trợ.", "citationIds": []},
                ],
            },
        ]
    })
    answer = validate_generated_answer(raw, citations, True)
    assert len(answer.sections[0].claims) == 1
    assert "Nội dung tài liệu." in answer.sections[0].content
    assert "Gợi ý câu hỏi" not in answer.sections[0].content
    assert len(answer.sections[1].claims) == 2
    assert "Kiến thức mở rộng" in answer.sections[1].claims[0].text
    assert "💡 Gợi ý câu hỏi" in answer.sections[1].claims[1].text
    assert answer.sections[1].claims[1].citationIds == []
    assert "[1]" not in answer.sections[1].claims[1].text


def test_should_retry_when_expanded_answer_omits_external_section() -> None:
    responses = [
        ProviderResult(generated(), "hive", "test", "primary"),
        ProviderResult(generated(expanded=True), "hive", "test", "primary"),
    ]
    with patch("app.core.rag.llm_provider.generate", side_effect=responses) as generator:
        result = generate_rag_answer(
            "RAG là gì?", [candidate()], [DOCUMENT_ID],
            allow_external_knowledge=True, policy=policy(), sources=[source()],
        )

    assert generator.call_count == 2
    assert "BẮT BUỘC bổ sung ít nhất một section EXTERNAL" in generator.call_args.args[0]
    assert result["validationFailed"] is False
    assert [section["type"] for section in result["sections"]] == ["DOCUMENT", "EXTERNAL"]


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


def test_should_pass_definition_paragraph_to_generation_and_cite_its_slide() -> None:
    chroma_client, embedding_model = _definition_retrieval_dependencies(True)
    generated_answer = json.dumps(
        {
            "sections": [
                {
                    "type": "DOCUMENT",
                    "claims": [{"text": DEFINITION_TEXT, "citationIds": ["1"]}],
                }
            ]
        }
    )
    request = RetrievalAnswerRequest.model_validate(
        payload(question="Định nghĩa Architecture Characteristics là gì?")
    )

    with (
        patch("app.core.rag.retrieval_engine.get_chroma_client", return_value=chroma_client),
        patch("app.core.rag.retrieval_engine.get_embedding_model", return_value=embedding_model),
        patch("app.core.rag.retrieval_engine.get_active_collection_name", return_value="unichat_chunks_v1"),
        patch(
            "app.core.rag.llm_provider.generate",
            return_value=ProviderResult(generated_answer, "hive", "test-model", "primary"),
        ) as generator,
    ):
        response = complete_answer(prepare_answer(request))

    prompt = generator.call_args.args[0]
    assert response.decision == "ANSWER"
    assert DEFINITION_TEXT in prompt
    assert f"\n{TITLE_TEXT}\n" not in prompt
    assert response.answer == f"{DEFINITION_TEXT} [1]"
    assert response.citations[0].chunkId == "definition-chunk"
    assert response.citations[0].locator == "slide:5"
    assert DEFINITION_TEXT.startswith(response.citations[0].excerpt)


def test_should_refuse_without_generation_when_only_title_is_retrieved() -> None:
    chroma_client, embedding_model = _definition_retrieval_dependencies(False)
    request = RetrievalAnswerRequest.model_validate(
        payload(question="Định nghĩa Architecture Characteristics là gì?")
    )

    with (
        patch("app.core.rag.retrieval_engine.get_chroma_client", return_value=chroma_client),
        patch("app.core.rag.retrieval_engine.get_embedding_model", return_value=embedding_model),
        patch("app.core.rag.retrieval_engine.get_active_collection_name", return_value="unichat_chunks_v1"),
        patch("app.core.rag.llm_provider.generate") as generator,
    ):
        response = complete_answer(prepare_answer(request))

    assert response.decision == "REFUSE"
    assert "chưa tìm thấy đoạn định nghĩa trực tiếp" in (response.refusalReason or "")
    assert response.citations == []
    generator.assert_not_called()
