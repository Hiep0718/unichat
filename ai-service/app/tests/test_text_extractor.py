import pytest
from app.services.text_extractor import extract_txt, extract_document

def test_extract_txt_line_ranges():
    sample_text = "Dòng 1: Xin chào\nDòng 2: UniChat AI Platform\n\nDòng 4: Tri thức đại học"
    chunks = extract_txt(sample_text.encode("utf-8"))

    assert len(chunks) > 0
    assert "Xin chào" in chunks[0].text
    assert chunks[0].locator_type == "TXT_LINE_RANGE"
    assert chunks[0].locator_value.startswith("lines:")

def test_extract_document_unsupported_type():
    with pytest.raises(ValueError, match="Định dạng tệp không được hỗ trợ"):
        extract_document(b"dummy bytes", "application/x-executable")
