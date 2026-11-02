"""Pure bounded packing helpers for hierarchical workspace reductions."""

import json
from typing import Any


def coverage_ids(items: list[dict[str, Any]]) -> set[str]:
    """Collect original document identities from leaf or intermediate summaries."""
    return {
        str(document_id)
        for item in items
        for document_id in item.get("documentCoverage", [item.get("documentId")])
    }


def serialized_size(items: list[dict[str, Any]]) -> int:
    """Measure conservative Unicode code point input cost."""
    return len(json.dumps(items, ensure_ascii=False, separators=(",", ":")))


def pack_summary_items(items: list[dict[str, Any]], budget: int) -> list[list[dict[str, Any]]]:
    """Pack every summary in stable order without sampling."""
    if budget < 1000:
        raise ValueError("SUMMARY_CONFIGURATION_INVALID")
    groups: list[list[dict[str, Any]]] = []
    current: list[dict[str, Any]] = []
    current_size = 2
    for item in items:
        item_size = serialized_size([item]) - 1
        if item_size > budget:
            raise ValueError("SUMMARY_DOCUMENT_EXCEEDS_INPUT_BUDGET")
        if current and current_size + item_size > budget:
            groups.append(current)
            current = []
            current_size = 2
        current.append(item)
        current_size += item_size
    if current:
        groups.append(current)
    return groups
