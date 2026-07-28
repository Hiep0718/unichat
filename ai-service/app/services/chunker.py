from typing import Any, Dict, List
from app.services.text_extractor import ExtractedChunk

class ChunkResult:
    def __init__(
        self,
        chunk_index: int,
        text: str,
        locator_type: str,
        locator_value: str,
        content_hash: str,
    ):
        self.chunk_index = chunk_index
        self.text = text
        self.locator_type = locator_type
        self.locator_value = locator_value
        self.content_hash = content_hash

    def to_dict(self) -> Dict[str, Any]:
        return {
            "chunk_index": self.chunk_index,
            "text": self.text,
            "locator_type": self.locator_type,
            "locator_value": self.locator_value,
            "content_hash": self.content_hash,
        }

def chunk_extracted_chunks(
    extracted_chunks: List[ExtractedChunk],
    max_chunk_size: int = 500,
    overlap: int = 50,
) -> List[ChunkResult]:
    final_chunks: List[ChunkResult] = []
    chunk_counter = 0

    for item in extracted_chunks:
        text = item.text
        if len(text) <= max_chunk_size:
            chunk_counter += 1
            final_chunks.append(
                ChunkResult(
                    chunk_index=chunk_counter,
                    text=text,
                    locator_type=item.locator_type,
                    locator_value=item.locator_value,
                    content_hash=item.content_hash,
                )
            )
        else:
            # Overlapping sliding window for long texts
            start = 0
            while start < len(text):
                end = start + max_chunk_size
                sub_text = text[start:end].strip()
                if sub_text:
                    chunk_counter += 1
                    final_chunks.append(
                        ChunkResult(
                            chunk_index=chunk_counter,
                            text=sub_text,
                            locator_type=item.locator_type,
                            locator_value=item.locator_value,
                            content_hash=item.content_hash,
                        )
                    )
                start += max_chunk_size - overlap

    return final_chunks
