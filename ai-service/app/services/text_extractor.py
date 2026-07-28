import hashlib
from typing import Any, Dict, List
from pypdf import PdfReader
import docx

class ExtractedChunk:
    def __init__(self, text: str, locator_type: str, locator_value: str, content_hash: str):
        self.text = text
        self.locator_type = locator_type
        self.locator_value = locator_value
        self.content_hash = content_hash

    def to_dict(self) -> Dict[str, Any]:
        return {
            "text": self.text,
            "locator_type": self.locator_type,
            "locator_value": self.locator_value,
            "content_hash": self.content_hash,
        }

def compute_hash(text: str) -> str:
    return hashlib.sha256(text.encode("utf-8")).hexdigest()

def extract_pdf(file_bytes: bytes) -> List[ExtractedChunk]:
    import io
    reader = PdfReader(io.BytesIO(file_bytes))
    chunks: List[ExtractedChunk] = []

    for i, page in enumerate(reader.pages, start=1):
        text = (page.extract_text() or "").strip()
        if text:
            locator_value = f"page:{i}"
            chunks.append(ExtractedChunk(
                text=text,
                locator_type="PDF_PAGE",
                locator_value=locator_value,
                content_hash=compute_hash(text),
            ))
    return chunks

def extract_docx(file_bytes: bytes) -> List[ExtractedChunk]:
    import io
    doc = docx.Document(io.BytesIO(file_bytes))
    chunks: List[ExtractedChunk] = []

    for idx, para in enumerate(doc.paragraphs, start=1):
        text = para.text.strip()
        if text:
            locator_value = f"paragraph:{idx}"
            chunks.append(ExtractedChunk(
                text=text,
                locator_type="DOCX_PARAGRAPH",
                locator_value=locator_value,
                content_hash=compute_hash(text),
            ))
    return chunks

def extract_txt(file_bytes: bytes) -> List[ExtractedChunk]:
    text_content = file_bytes.decode("utf-8", errors="replace")
    lines = text_content.splitlines()
    chunks: List[ExtractedChunk] = []

    batch_lines: List[str] = []
    start_line = 1

    for idx, line in enumerate(lines, start=1):
        if line.strip():
            if not batch_lines:
                start_line = idx
            batch_lines.append(line.strip())

        if len(batch_lines) >= 15 or idx == len(lines):
            if batch_lines:
                chunk_text = "\n".join(batch_lines)
                locator_value = f"lines:{start_line}-{idx}"
                chunks.append(ExtractedChunk(
                    text=chunk_text,
                    locator_type="TXT_LINE_RANGE",
                    locator_value=locator_value,
                    content_hash=compute_hash(chunk_text),
                ))
                batch_lines = []

    return chunks

def extract_document(file_bytes: bytes, media_type: str) -> List[ExtractedChunk]:
    if media_type == "application/pdf":
        return extract_pdf(file_bytes)
    elif media_type in (
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "application/docx",
    ):
        return extract_docx(file_bytes)
    elif media_type == "text/plain":
        return extract_txt(file_bytes)
    else:
        raise ValueError(f"Định dạng tệp không được hỗ trợ: {media_type}")
