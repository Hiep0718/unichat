"""Citation and claim validation; no unverifiable statement is labelled document-backed."""

import re
from typing import Any

from app.core.rag.contracts import AnswerSection, CitationItem, GeneratedAnswer

_LOCATOR = re.compile(
    r"^(?:page:[1-9]\d*|paragraph:[1-9]\d*|"
    r"table:[1-9]\d*/row:[1-9]\d*/cell:[1-9]\d*|"
    r"line:[1-9]\d*(?:-[1-9]\d*)?|slide:[1-9]\d*|sheet:[1-9]\d*|section:[1-9]\d*)$"
)
_REFERENCE = re.compile(r"\[(\d+)\]")
EXTERNAL_LABEL = "Kiến thức mở rộng, chưa được tài liệu kiểm chứng"


def is_valid_locator(locator: str) -> bool:
    """Accept a positive, correctly ordered PDF/DOCX/TXT locator."""
    if not _LOCATOR.fullmatch(locator):
        return False
    if locator.startswith("line:") and "-" in locator:
        start, end = locator[5:].split("-")
        return int(start) <= int(end)
    return True


def validate_citations(citations: list[dict[str, Any]], allowed_document_ids: list[str]) -> bool:
    """Validate basic citation structure; source authenticity is checked before construction."""
    return bool(citations) and all(
        item.get("documentId") in allowed_document_ids
        and bool(str(item.get("excerpt", "")).strip())
        and is_valid_locator(str(item.get("locator", "")))
        for item in citations
    )


def validate_generated_answer(
    raw: str, citations: list[CitationItem], expanded: bool
) -> GeneratedAnswer:
    """Parse complete sections and enforce references on every document claim."""
    answer = GeneratedAnswer.model_validate_json(raw)
    identifiers = {citation.citationId for citation in citations}
    doc_to_citation = {citation.documentId: citation.citationId for citation in citations}
    if not identifiers or not any(section.type == "DOCUMENT" for section in answer.sections):
        raise ValueError("DOCUMENT_EVIDENCE_REQUIRED")
    for section in answer.sections:
        if section.type == "DOCUMENT":
            for claim in section.claims:
                claim.citationIds = [
                    doc_to_citation.get(cid, cid) for cid in claim.citationIds
                ]
        _validate_section(section, identifiers, expanded)
    return answer


def _validate_section(section: AnswerSection, identifiers: set[str], expanded: bool) -> None:
    if section.type == "EXTERNAL" and not expanded:
        raise ValueError("EXTERNAL_KNOWLEDGE_DISABLED")
    for claim in section.claims:
        references = set(claim.citationIds)
        inline = set(_REFERENCE.findall(claim.text))
        if section.type == "DOCUMENT":
            if not references or not references <= identifiers or not inline <= references:
                raise ValueError("CLAIM_CITATIONS_INVALID")
        elif references or inline:
            raise ValueError("EXTERNAL_CITATION_INVALID")
    plain = "\n\n".join(claim.text for claim in section.claims)
    if section.content and section.content != plain:
        raise ValueError("UNCOVERED_SECTION_CONTENT")
    section.content = "\n\n".join(
        _render_claim(claim.text, claim.citationIds) for claim in section.claims
    )


def _render_claim(text: str, citation_ids: list[str]) -> str:
    return text + "".join(
        f" [{identifier}]" for identifier in citation_ids if f"[{identifier}]" not in text
    )


def render_answer(answer: GeneratedAnswer) -> str:
    """Render canonical prose with an explicit label before every external section."""
    return "\n\n".join(
        f"### {EXTERNAL_LABEL}\n\n{section.content}"
        if section.type == "EXTERNAL"
        else section.content
        for section in answer.sections
    )
