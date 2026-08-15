"""Tests for heuristic heading extraction in text_extractor.py (R-01)."""

from app.services.text_extractor import (
    _is_heading_heuristic,
    extract_blocks,
    extract_txt_blocks,
)


def test_heading_heuristic_patterns() -> None:
    is_h, level = _is_heading_heuristic("CHƯƠNG 1: TỔNG QUAN", True, True)
    assert is_h is True
    assert level == 1

    is_h, level = _is_heading_heuristic("Điều 12. Quy định chung", True, True)
    assert is_h is True
    assert level == 2

    is_h, level = _is_heading_heuristic("I. GIỚI THIỆU", True, True)
    assert is_h is True
    assert level == 1

    is_h, level = _is_heading_heuristic("# Title Markdown", True, True)
    assert is_h is True
    assert level == 1

    is_h, level = _is_heading_heuristic("Đây là một đoạn văn bản bình thường dài để thử nghiệm.", False, False)
    assert is_h is False


def test_extract_txt_blocks() -> None:
    content = "CHƯƠNG I: QUY CHẾ\n\nĐây là nội dung đoạn 1.\n\nĐiều 1: Khái niệm\nNội dung điều 1."
    blocks = extract_txt_blocks(content.encode("utf-8"))

    assert len(blocks) >= 3
    assert blocks[0].block_type == "HEADING"
    assert blocks[0].heading_level == 1
    assert "CHƯƠNG I" in blocks[0].text
