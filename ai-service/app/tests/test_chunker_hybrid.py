"""Tests for Hybrid 3-Level Chunker in chunker.py."""

from app.services.chunker import ChunkResult, chunk_blocks_hybrid
from app.services.text_extractor import ExtractedBlock


def test_hybrid_chunker_keeps_chunks_with_different_locators_separate() -> None:
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
    assert len(chunks) == 2
    assert all(isinstance(chunk, ChunkResult) for chunk in chunks)
    assert [chunk.locator_value for chunk in chunks] == ["line:1", "line:2"]
    assert chunks[0].section_heading == "CHƯƠNG 1: GIỚI THIỆU"
    assert "Nội dung chương 1" in chunks[1].text


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


def test_hybrid_chunker_preserves_long_table_rows_without_truncation() -> None:
    table_text = "row one\nrow two\nrow three is longer\nrow four"
    block = ExtractedBlock(
        text=table_text,
        block_type="TABLE",
        heading_level=None,
        locator_type="DOCX_TABLE_CELL",
        locator_value="table:1/row:1/cell:1",
        content_hash="table",
        source_page_or_index=1,
    )

    chunks = chunk_blocks_hybrid([block], max_chunk_size=12, min_chunk_size=0)

    assert all(len(chunk.text) <= 12 for chunk in chunks)
    assert "".join(chunk.text for chunk in chunks) == table_text
    assert {chunk.locator_value for chunk in chunks} == {"table:1/row:1/cell:1"}


def test_hybrid_chunker_splits_oversized_unbroken_text_losslessly() -> None:
    block = ExtractedBlock(
        text="x" * 27,
        block_type="PARAGRAPH",
        heading_level=None,
        locator_type="PDF_PAGE",
        locator_value="page:4",
        content_hash="long",
        source_page_or_index=4,
    )

    chunks = chunk_blocks_hybrid([block], max_chunk_size=8, min_chunk_size=0, sentence_overlap=0)

    assert [len(chunk.text) for chunk in chunks] == [8, 8, 8, 3]
    assert "".join(chunk.text for chunk in chunks) == block.text


def test_hybrid_chunker_does_not_merge_short_chunks_across_locators() -> None:
    blocks = [
        ExtractedBlock("alpha", "PARAGRAPH", None, "PDF_PAGE", "page:1", "a", 1),
        ExtractedBlock("beta", "PARAGRAPH", None, "PDF_PAGE", "page:2", "b", 2),
    ]

    chunks = chunk_blocks_hybrid(blocks, min_chunk_size=100)

    assert [chunk.locator_value for chunk in chunks] == ["page:1", "page:2"]


def test_should_keep_definition_paragraph_at_its_supporting_slide() -> None:
    title = "Architecture Characteristics Defined"
    definition = (
        "Architecture characteristics are non-domain design considerations "
        "that describe operational and structural qualities."
    )
    blocks = [
        ExtractedBlock(title, "HEADING", 1, "SLIDE_NUMBER", "slide:4", "title", 4),
        ExtractedBlock(
            definition,
            "PARAGRAPH",
            None,
            "SLIDE_NUMBER",
            "slide:5",
            "definition",
            5,
        ),
    ]

    chunks = chunk_blocks_hybrid(blocks, min_chunk_size=0)

    assert [(chunk.locator_value, chunk.text) for chunk in chunks] == [
        ("slide:4", title),
        ("slide:5", definition),
    ]
    assert chunks[1].section_heading == title
