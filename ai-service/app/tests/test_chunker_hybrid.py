"""Tests for Hybrid 3-Level Chunker in chunker.py."""

from app.services.chunker import ChunkResult, chunk_blocks_hybrid
from app.services.text_extractor import ExtractedBlock


def test_hybrid_chunker_section_fits() -> None:
    blocks = [
        ExtractedBlock(
            text="CHƯƠNG 1: GIỚI THIỆU",
            block_type="HEADING",
            heading_level=1,
            locator_type="TXT_LINE_RANGE",
            locator_value="line:1",
            content_hash="h1",
            source_page_or_index=1,
        ),
        ExtractedBlock(
            text="Nội dung chương 1 ngắn gọn vừa đủ một chunk.",
            block_type="PARAGRAPH",
            heading_level=None,
            locator_type="TXT_LINE_RANGE",
            locator_value="line:2",
            content_hash="h2",
            source_page_or_index=2,
        ),
    ]

    chunks = chunk_blocks_hybrid(blocks, max_chunk_size=500)
    assert len(chunks) == 1
    assert isinstance(chunks[0], ChunkResult)
    assert chunks[0].chunk_level == 1
    assert "CHƯƠNG 1" in chunks[0].text


def test_hybrid_chunker_sentence_split() -> None:
    long_para = "Câu một dài. " * 30 + "Câu hai dài tiếp. " * 30
    blocks = [
        ExtractedBlock(
            text="CHƯƠNG 2: CHI TIẾT",
            block_type="HEADING",
            heading_level=1,
            locator_type="TXT_LINE_RANGE",
            locator_value="line:1",
            content_hash="h1",
            source_page_or_index=1,
        ),
        ExtractedBlock(
            text=long_para,
            block_type="PARAGRAPH",
            heading_level=None,
            locator_type="TXT_LINE_RANGE",
            locator_value="line:2",
            content_hash="h2",
            source_page_or_index=2,
        ),
    ]

    chunks = chunk_blocks_hybrid(blocks, max_chunk_size=200, min_chunk_size=50)
    assert len(chunks) > 1
    assert any(c.chunk_level == 3 for c in chunks)
