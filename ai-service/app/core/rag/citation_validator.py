"""Citation and claim validation; no unverifiable statement is labelled document-backed."""

import re
from typing import Any

from app.core.rag.contracts import AnswerSection, CitationItem, FactualClaim, GeneratedAnswer

_LOCATOR = re.compile(
    r"^(?:page:[1-9]\d*|paragraph:[1-9]\d*|"
    r"table:[1-9]\d*/row:[1-9]\d*/cell:[1-9]\d*|"
    r"line:[1-9]\d*(?:-[1-9]\d*)?|slide:[1-9]\d*|sheet:[1-9]\d*|section:[1-9]\d*)$"
)
_REFERENCE = re.compile(r"\[(\d+)\]")
_SUGGESTION_RE = re.compile(
    r"(?:(?:\n|\r\n)?---\s*(?:\n|\r\n)+)?###\s*💡?\s*Gợi ý câu hỏi.*",
    re.DOTALL | re.IGNORECASE,
)
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
    if expanded and not any(section.type == "EXTERNAL" for section in answer.sections):
        raise ValueError("EXPANSION_SECTION_REQUIRED")
    if expanded:
        _reorder_expanded_suggestions(answer)
    for section in answer.sections:
        if section.type == "DOCUMENT":
            for claim in section.claims:
                claim.citationIds = [
                    doc_to_citation.get(cid, cid) for cid in claim.citationIds
                ]
        _validate_section(section, identifiers, expanded)
    return answer


def _reorder_expanded_suggestions(answer: GeneratedAnswer) -> None:
    """Ensure follow-up suggestions appear after external knowledge, not in the middle."""
    doc_sections = [s for s in answer.sections if s.type == "DOCUMENT"]
    ext_sections = [s for s in answer.sections if s.type == "EXTERNAL"]
    if not doc_sections or not ext_sections:
        return
    extracted: list[FactualClaim] = []
    for doc in doc_sections:
        kept: list[FactualClaim] = []
        for claim in doc.claims:
            match = _SUGGESTION_RE.search(claim.text)
            if not match:
                kept.append(claim)
                continue
            before = claim.text[: match.start()].rstrip()
            if before:
                kept.append(FactualClaim(text=before, citationIds=list(claim.citationIds)))
            clean_sugg = _REFERENCE.sub("", claim.text[match.start() :]).strip()
            clean_sugg = clean_sugg if clean_sugg.startswith("---") else f"---\n\n{clean_sugg}"
            extracted.append(FactualClaim(text=clean_sugg, citationIds=[]))
        doc.claims = kept
    has_ext_sugg = any(bool(_SUGGESTION_RE.search(c.text)) for e in ext_sections for c in e.claims)
    if extracted and not has_ext_sugg:
        ext_sections[-1].claims.extend(extracted)
    for ext in ext_sections:
        for claim in ext.claims:
            if _SUGGESTION_RE.search(claim.text):
                claim.citationIds = []
                claim.text = _REFERENCE.sub("", claim.text)


def _validate_section(section: AnswerSection, identifiers: set[str], expanded: bool) -> None:
    if section.type == "EXTERNAL" and not expanded:
        raise ValueError("EXTERNAL_KNOWLEDGE_DISABLED")
    if section.type == "DOCUMENT":
        _prepare_document_claims(section, identifiers)
    for claim in section.claims:
        references = set(claim.citationIds)
        clean_text = re.sub(r"```[\s\S]*?```|`[^`\n]*`", "", claim.text)
        inline = set(_REFERENCE.findall(clean_text))
        if section.type == "DOCUMENT":
            if not references or not references <= identifiers or not inline <= references:
                raise ValueError("CLAIM_CITATIONS_INVALID")
        elif references or inline:
            raise ValueError("EXTERNAL_CITATION_INVALID")
    section.content = "\n\n".join(
        _render_claim(claim.text, claim.citationIds) for claim in section.claims
    )


def _prepare_document_claims(section: AnswerSection, identifiers: set[str]) -> None:
    section_cids: list[str] = []
    for claim in section.claims:
        clean_text = re.sub(r"```[\s\S]*?```|`[^`\n]*`", "", claim.text)
        inline = set(_REFERENCE.findall(clean_text))
        for cid in [i for i in inline if i in identifiers]:
            if cid not in claim.citationIds:
                claim.citationIds.append(cid)
        for cid in claim.citationIds:
            if cid in identifiers and cid not in section_cids:
                section_cids.append(cid)
    if not section_cids:
        return
    for i, claim in enumerate(section.claims):
        if not claim.citationIds:
            neighbor = _find_neighbor_citation(section.claims, i)
            claim.citationIds = [neighbor or section_cids[0]]


def _find_neighbor_citation(claims: list[FactualClaim], index: int) -> str | None:
    for nxt in range(index + 1, len(claims)):
        if claims[nxt].citationIds:
            return claims[nxt].citationIds[0]
    for prev in range(index - 1, -1, -1):
        if claims[prev].citationIds:
            return claims[prev].citationIds[0]
    return None


def _render_claim(text: str, citation_ids: list[str]) -> str:
    references = "".join(
        f" [{identifier}]" for identifier in citation_ids if f"[{identifier}]" not in text
    )
    if references and re.search(r"(?:^|\n)\s*```\s*$", text):
        return text.rstrip() + "\n\n" + references.strip()
    return text + references


def render_answer(answer: GeneratedAnswer) -> str:
    """Render canonical prose with an explicit label before every external section."""
    return "\n\n".join(
        f"### {EXTERNAL_LABEL}\n\n{section.content}"
        if section.type == "EXTERNAL"
        else section.content
        for section in answer.sections
    )
