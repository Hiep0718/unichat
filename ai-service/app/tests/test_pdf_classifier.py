import pytest
from app.services.pdf_classifier import PdfLayoutType, classify_pdf_layout
from app.services.text_extractor import extract_pdf_blocks


def test_pdf_classifier_empty_bytes() -> None:
    """Empty or invalid bytes should default to CONTINUOUS_TEXT without crashing."""
    result = classify_pdf_layout(b"invalid pdf data")
    assert result == PdfLayoutType.CONTINUOUS_TEXT


def test_extract_pdf_blocks_adaptive_fallback() -> None:
    """Non-PDF or malformed PDF fallback handling."""
    with pytest.raises(ValueError):
        extract_pdf_blocks(b"dummy text")
