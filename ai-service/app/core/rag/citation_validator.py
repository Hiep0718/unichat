"""Citation Validator for Adaptive Retrieval v1.

Validates that LLM generated citations strictly reference authorized document IDs,
valid locators, and non-empty excerpts.
"""

from typing import Any


def validate_citations(
    citations: list[dict[str, Any]],
    allowed_document_ids: list[str],
) -> bool:
    """Return True if all citations are valid, else False."""
    if not citations:
        return True

    allowed_set = set(allowed_document_ids)

    for item in citations:
        doc_id = str(item.get("documentId") or "")
        locator = str(item.get("locator") or "")
        excerpt = str(item.get("excerpt") or "")

        # Must reference an authorized document ID
        if doc_id not in allowed_set:
            return False

        # Excerpt and locator must be non-empty
        if not excerpt.strip() or not locator.strip():
            return False

    return True
