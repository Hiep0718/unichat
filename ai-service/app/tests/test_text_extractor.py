import pytest

from app.services.text_extractor import extract_document, extract_txt


def test_extract_txt_line_ranges() -> None:
    sample_text = "Dòng 1: Xin chào\nDòng 2: UniChat AI Platform\n\nDòng 4: Tri thức đại học"
    chunks = extract_txt(sample_text.encode("utf-8"))

    assert len(chunks) > 0
    assert "Xin chào" in chunks[0].text
    assert chunks[0].locator_type == "TXT_LINE_RANGE"
    assert chunks[0].locator_value.startswith("line")

    chunk_dict = chunks[0].to_dict()
    assert chunk_dict["text"] == chunks[0].text
    assert chunk_dict["locator_type"] == "TXT_LINE_RANGE"


def test_extract_document_text_plain() -> None:
    sample_text = "Nội dung văn bản thử nghiệm"
    chunks = extract_document(sample_text.encode("utf-8"), "text/plain")
    assert len(chunks) == 1
    assert chunks[0].text == "Nội dung văn bản thử nghiệm"


def test_extract_document_unsupported_type() -> None:
    with pytest.raises(ValueError, match="Định dạng tệp không được hỗ trợ"):
        extract_document(b"dummy bytes", "application/x-executable")
