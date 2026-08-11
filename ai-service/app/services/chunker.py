"""Hybrid 3-level chunker module (Header -> Paragraph -> Sentence)."""

import hashlib
from typing import Any

from app.services.sentence_splitter import split_sentences
from app.services.text_extractor import ExtractedBlock, ExtractedChunk

DEFAULT_MAX_CHUNK_SIZE = 800
DEFAULT_MIN_CHUNK_SIZE = 100
DEFAULT_SENTENCE_OVERLAP = 2


class ChunkResult:
    def __init__(
        self,
        chunk_index: int,
        text: str,
        locator_type: str,
        locator_value: str,
        content_hash: str,
        section_heading: str | None = None,
        chunk_level: int = 1,
    ) -> None:
        self.chunk_index = chunk_index
        self.text = text
        self.locator_type = locator_type
        self.locator_value = locator_value
        self.content_hash = content_hash
        self.section_heading = section_heading
        self.chunk_level = chunk_level

    def to_dict(self) -> dict[str, Any]:
        return {
            "chunk_index": self.chunk_index,
            "text": self.text,
            "locator_type": self.locator_type,
            "locator_value": self.locator_value,
            "content_hash": self.content_hash,
            "section_heading": self.section_heading,
            "chunk_level": self.chunk_level,
        }


def compute_hash(text: str) -> str:
    return hashlib.sha256(text.encode("utf-8")).hexdigest()


def chunk_blocks_hybrid(
    blocks: list[ExtractedBlock],
    max_chunk_size: int = DEFAULT_MAX_CHUNK_SIZE,
    min_chunk_size: int = DEFAULT_MIN_CHUNK_SIZE,
    sentence_overlap: int = DEFAULT_SENTENCE_OVERLAP,
) -> list[ChunkResult]:
    """Hybrid 3-level chunking: Header (Level 1) -> Paragraph (Level 2) -> Sentence (Level 3)."""
    if not blocks:
        return []

    # 1. Group blocks by sections (Level 1)
    sections: list[dict[str, Any]] = []
    current_heading: str | None = None
    current_blocks: list[ExtractedBlock] = []

    for block in blocks:
        if block.block_type == "HEADING":
            if current_blocks:
                sections.append({
                    "heading": current_heading,
                    "blocks": current_blocks,
                })
                current_blocks = []
            current_heading = block.text
            current_blocks.append(block)
        else:
            current_blocks.append(block)

    if current_blocks:
        sections.append({
            "heading": current_heading,
            "blocks": current_blocks,
        })

    # 2. Process sections into chunks
    raw_chunks: list[dict[str, Any]] = []

    for sec in sections:
        sec_heading = sec["heading"]
        sec_blocks: list[ExtractedBlock] = sec["blocks"]
        sec_text = "\n\n".join(b.text for b in sec_blocks)

        # Level 1: Full Section fits in max_chunk_size
        if len(sec_text) <= max_chunk_size:
            raw_chunks.append({
                "text": sec_text,
                "locator_type": sec_blocks[0].locator_type,
                "locator_value": sec_blocks[0].locator_value,
                "heading": sec_heading,
                "level": 1,
            })
            continue

        # Level 2: Section too large -> Split by paragraphs / blocks
        for block in sec_blocks:
            b_text = block.text
            if len(b_text) <= max_chunk_size:
                raw_chunks.append({
                    "text": b_text,
                    "locator_type": block.locator_type,
                    "locator_value": block.locator_value,
                    "heading": sec_heading,
                    "level": 2,
                })
            else:
                # Level 3: Paragraph too large -> Split by sentences with overlap
                sentences = split_sentences(b_text)
                if not sentences:
                    continue

                sentence_idx = 0
                while sentence_idx < len(sentences):
                    accumulated: list[str] = []
                    acc_len = 0

                    while sentence_idx < len(sentences):
                        s = sentences[sentence_idx]
                        if acc_len + len(s) > max_chunk_size and accumulated:
                            break
                        accumulated.append(s)
                        acc_len += len(s)
                        sentence_idx += 1

                    chunk_text = " ".join(accumulated)
                    raw_chunks.append({
                        "text": chunk_text,
                        "locator_type": block.locator_type,
                        "locator_value": block.locator_value,
                        "heading": sec_heading,
                        "level": 3,
                    })

                    # Apply sentence overlap
                    if sentence_idx < len(sentences) and sentence_overlap > 0:
                        sentence_idx = max(sentence_idx - sentence_overlap, 0)
                        if sentence_idx >= len(sentences) - 1:
                            break

    # 3. Post-processing: Merge short chunks (< min_chunk_size) with adjacent chunks
    merged_chunks: list[dict[str, Any]] = []
    i = 0
    while i < len(raw_chunks):
        c = raw_chunks[i]
        if len(c["text"]) < min_chunk_size and merged_chunks:
            # Merge with previous chunk if same heading
            prev = merged_chunks[-1]
            if prev["heading"] == c["heading"] and len(prev["text"]) + len(c["text"]) <= max_chunk_size:
                prev["text"] = prev["text"] + "\n\n" + c["text"]
                i += 1
                continue

        merged_chunks.append(c)
        i += 1

    # 4. Wrap into ChunkResult
    results: list[ChunkResult] = []
    for idx, c in enumerate(merged_chunks, start=1):
        text = c["text"]
        results.append(
            ChunkResult(
                chunk_index=idx,
                text=text,
                locator_type=c["locator_type"],
                locator_value=c["locator_value"],
                content_hash=compute_hash(text),
                section_heading=c["heading"],
                chunk_level=c["level"],
            )
        )

    return results


# Legacy wrapper
def chunk_extracted_chunks(
    extracted_chunks: list[ExtractedChunk],
    max_chunk_size: int = DEFAULT_MAX_CHUNK_SIZE,
    overlap: int = 50,
) -> list[ChunkResult]:
    """Legacy chunking adapter for backward compatibility."""
    blocks: list[ExtractedBlock] = []
    for idx, item in enumerate(extracted_chunks, start=1):
        blocks.append(
            ExtractedBlock(
                text=item.text,
                block_type="PARAGRAPH",
                heading_level=None,
                locator_type=item.locator_type,
                locator_value=item.locator_value,
                content_hash=item.content_hash,
                source_page_or_index=idx,
            )
        )
    return chunk_blocks_hybrid(blocks, max_chunk_size=max_chunk_size)
