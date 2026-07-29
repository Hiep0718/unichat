import pytest

from app.services.text_extractor import extract_document, extract_txt


def test_extract_corrupted_pdf_throws_exception() -> None:
    corrupted_pdf_bytes = b"%PDF-1.4 malformed header and corrupted binary data $$$$"
    with pytest.raises(Exception):
        extract_document(corrupted_pdf_bytes, "application/pdf")

def test_extract_corrupted_docx_throws_exception() -> None:
    corrupted_docx_bytes = b"PK\x03\x04 corrupted zip container without word/document.xml"
    with pytest.raises(Exception):
        extract_document(
            corrupted_docx_bytes,
            "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        )

def test_extract_txt_with_bom_and_bad_bytes() -> None:
    # File containing UTF-8 BOM and replacement characters
    bad_bytes = "\ufeffDòng 1: Xin chào\n\xff\xfe Dòng 2: Nội dung dỗi".encode("utf-8")
    chunks = extract_txt(bad_bytes)
    assert len(chunks) > 0
    assert "Xin chào" in chunks[0].text
