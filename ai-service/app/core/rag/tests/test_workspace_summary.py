"""Source-completeness and provenance regressions for workspace summaries."""

import json
import re
import time
from types import SimpleNamespace

import pytest

from app.core.rag import workspace_summary
from app.core.rag.generation_policy import GenerationPolicy
from app.services.vector_store import StoredDocumentChunk


def policy() -> GenerationPolicy:
    return GenerationPolicy("request", "operation", True, time.time() + 100)


def chunk(index: int) -> StoredDocumentChunk:
    return StoredDocumentChunk(
        f"document_{index}", index, "nội dung " * 60, "PAGE", str(index), "hash"
    )


def test_should_process_every_chunk_across_map_and_document_reduce(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    seen: list[str] = []

    def fake_generate(prompt: str, *_args: object, **_kwargs: object) -> SimpleNamespace:
        seen.append(prompt)
        ids = sorted(set(re.findall(r"document_\d+", prompt)))
        body = {
            "summary": "Tóm tắt",
            "topics": ["kiến trúc"],
            "claims": [{"text": "Nội dung", "chunkIds": ids}],
        }
        return SimpleNamespace(text=json.dumps(body, ensure_ascii=False))

    monkeypatch.setattr(workspace_summary, "generate", fake_generate)

    result = workspace_summary.summarize_document(
        "document", "Tài liệu.pdf", [chunk(1), chunk(2), chunk(3)], policy(), 2000
    )

    assert result["processedChunkCount"] == 3
    assert {item for claim in result["claims"] for item in claim["chunkIds"]} == {
        "document_1",
        "document_2",
        "document_3",
    }
    assert all(any(f"document_{index}" in prompt for prompt in seen) for index in (1, 2, 3))


def test_should_resolve_cited_source_from_original_chunk_metadata() -> None:
    original = StoredDocumentChunk(
        "document_1", 1, "Nội dung gốc", "PDF_PAGE", "page:7", "a" * 64
    )

    sources = workspace_summary.cited_sources(
        [original], [{"text": "Tóm tắt", "chunkIds": ["document_1"]}], 3
    )

    assert sources == [{"chunkId": "document_1", "locator": "page:7",
                        "excerpt": "Nội dung gốc", "contentHash": "a" * 64,
                        "ingestionVersion": 3}]


def test_should_reject_citation_without_original_chunk_metadata() -> None:
    with pytest.raises(ValueError, match="SUMMARY_CITATION_INVALID"):
        workspace_summary.cited_sources([], [{"chunkIds": ["document_1"]}], 1)


def test_should_retry_workspace_output_that_omits_a_document(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    calls = 0

    def fake_generate(_prompt: str, *_args: object, **_kwargs: object) -> SimpleNamespace:
        nonlocal calls
        calls += 1
        coverage = ["document-a"] if calls == 1 else ["document-a", "document-b"]
        body = {
            "overview": "Tổng quan",
            "overviewChunkIds": ["document-a_1"],
            "documentCoverage": coverage,
            "insights": [],
        }
        return SimpleNamespace(text=json.dumps(body))

    monkeypatch.setattr(workspace_summary, "generate", fake_generate)
    items = [
        {
            "documentId": document_id,
            "summary": "Tóm tắt",
            "claims": [{"text": "Thông tin", "chunkIds": [f"{document_id}_1"]}],
        }
        for document_id in ("document-a", "document-b")
    ]

    result = workspace_summary.summarize_workspace(items, policy(), 4000)

    assert set(result.documentCoverage) == {"document-a", "document-b"}
    assert calls == 2


def test_should_reject_citation_outside_original_document_claims(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    body = {
        "overview": "Tổng quan",
        "overviewChunkIds": ["fabricated_1"],
        "documentCoverage": ["document-a"],
        "insights": [],
    }
    monkeypatch.setattr(
        workspace_summary,
        "generate",
        lambda *_args, **_kwargs: SimpleNamespace(text=json.dumps(body)),
    )

    with pytest.raises(ValueError, match="SUMMARY_CITATION_INVALID"):
        workspace_summary.summarize_workspace(
            [
                {
                    "documentId": "document-a",
                    "claims": [{"text": "Thông tin", "chunkIds": ["document-a_1"]}],
                }
            ],
            policy(),
            4000,
        )


def test_should_reject_cross_document_insight_citing_only_one_source(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    body = {
        "overview": "Tổng quan",
        "overviewChunkIds": ["document-a_1"],
        "documentCoverage": ["document-a", "document-b"],
        "insights": [
            {
                "text": "Liên hệ",
                "documentIds": ["document-a", "document-b"],
                "chunkIds": ["document-a_1", "document-a_2"],
            }
        ],
    }
    monkeypatch.setattr(
        workspace_summary,
        "generate",
        lambda *_args, **_kwargs: SimpleNamespace(text=json.dumps(body)),
    )
    items = [
        {
            "documentId": document_id,
            "claims": [{"text": "Thông tin", "chunkIds": [f"{document_id}_1", f"{document_id}_2"]}],
        }
        for document_id in ("document-a", "document-b")
    ]

    with pytest.raises(ValueError, match="SUMMARY_CITATION_INVALID"):
        workspace_summary.summarize_workspace(items, policy(), 4000)
