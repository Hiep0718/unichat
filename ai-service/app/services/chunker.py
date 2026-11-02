"""Hybrid 3-level chunker module (Header -> Paragraph -> Sentence)."""

import hashlib
import re
from dataclasses import dataclass
from typing import Any

from app.services.text_extractor import ExtractedBlock, ExtractedChunk

DEFAULT_MAX_CHUNK_SIZE = 3000
DEFAULT_MIN_CHUNK_SIZE = 200
DEFAULT_SENTENCE_OVERLAP = 2
CHUNKING_VERSION = "2.0"


class ChunkResult:
    """Text chunk with a single source locator and deterministic content hash."""

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
        """Serialize chunk metadata for existing ingestion consumers."""
        return {
            "chunk_index": self.chunk_index,
            "text": self.text,
            "locator_type": self.locator_type,
            "locator_value": self.locator_value,
            "content_hash": self.content_hash,
            "section_heading": self.section_heading,
            "chunk_level": self.chunk_level,
        }


@dataclass(frozen=True)
class _SourceGroup:
    blocks: list[ExtractedBlock]
    heading: str | None


@dataclass(frozen=True)
class _RawChunk:
    text: str
    locator_type: str
    locator_value: str
    heading: str | None
    level: int


def compute_hash(text: str) -> str:
    """Return the UTF-8 SHA-256 digest of source text."""
    return hashlib.sha256(text.encode("utf-8")).hexdigest()


def chunk_blocks_hybrid(
    blocks: list[ExtractedBlock],
    max_chunk_size: int = DEFAULT_MAX_CHUNK_SIZE,
    min_chunk_size: int = DEFAULT_MIN_CHUNK_SIZE,
    sentence_overlap: int = DEFAULT_SENTENCE_OVERLAP,
) -> list[ChunkResult]:
    """Create lossless chunks whose text shares one source locator."""
    if not blocks:
        return []
    _validate_options(max_chunk_size, min_chunk_size, sentence_overlap)
    raw_chunks = [
        chunk
        for group in _group_source_blocks(blocks)
        for chunk in _chunks_for_group(group, max_chunk_size, sentence_overlap)
    ]
    merged = _merge_short_chunks(raw_chunks, min_chunk_size, max_chunk_size)
    return _to_chunk_results(merged)


def _validate_options(max_size: int, min_size: int, overlap: int) -> None:
    if max_size < 1 or min_size < 0 or overlap < 0:
        raise ValueError("Chunk limits must be non-negative and max size must be positive.")


def _group_source_blocks(blocks: list[ExtractedBlock]) -> list[_SourceGroup]:
    groups: list[_SourceGroup] = []
    current: list[ExtractedBlock] = []
    heading: str | None = None
    current_key: tuple[str, str, str | None] | None = None
    for block in blocks:
        if block.block_type == "HEADING":
            heading = block.text
        key = (block.locator_type, block.locator_value, heading)
        if current and key != current_key:
            groups.append(_SourceGroup(current, current_key[2] if current_key else None))
            current = []
        current.append(block)
        current_key = key
    if current:
        groups.append(_SourceGroup(current, heading))
    return groups


def _chunks_for_group(
    group: _SourceGroup, max_size: int, overlap: int
) -> list[_RawChunk]:
    text = "\n\n".join(block.text for block in group.blocks)
    if not text:
        return []
    first = group.blocks[0]
    level = 1 if len(text) <= max_size else 3
    effective_overlap = 0 if all(block.block_type == "TABLE" for block in group.blocks) else overlap
    pieces = [text] if level == 1 else _pack_source_text(text, max_size, effective_overlap)
    return [
        _RawChunk(piece, first.locator_type, first.locator_value, group.heading, level)
        for piece in pieces
    ]


def _pack_source_text(text: str, max_size: int, overlap: int) -> list[str]:
    units = _sentence_units(text)
    bounded_units = [
        piece
        for unit in units
        for piece in (_split_oversized_unit(unit, max_size) if len(unit) > max_size else [unit])
    ]
    return _pack_units(bounded_units, max_size, overlap)


def _sentence_units(text: str) -> list[str]:
    boundaries = [match.end() for match in re.finditer(r"(?<=[.!?])\s+|\n+|;\n+", text)]
    units: list[str] = []
    start = 0
    for boundary in boundaries:
        if boundary > start:
            units.append(text[start:boundary])
            start = boundary
    if start < len(text):
        units.append(text[start:])
    return units or [text]


def _split_oversized_unit(unit: str, max_size: int) -> list[str]:
    parts: list[str] = []
    start = 0
    while start < len(unit):
        end = min(start + max_size, len(unit))
        if end < len(unit):
            end = _preferred_boundary(unit, start, end)
        parts.append(unit[start:end])
        start = end
    return parts


def _preferred_boundary(text: str, start: int, end: int) -> int:
    window = text[start:end]
    sentence_end = 0
    whitespace_end = 0
    for match in re.finditer(r"\s+", window):
        whitespace_end = match.end()
        if match.start() > 0 and window[match.start() - 1] in ".!?":
            sentence_end = match.end()
    return start + sentence_end if sentence_end else (
        start + whitespace_end if whitespace_end else end
    )


def _pack_units(units: list[str], max_size: int, overlap: int) -> list[str]:
    chunks: list[str] = []
    start = 0
    while start < len(units):
        end = start
        size = 0
        while end < len(units) and size + len(units[end]) <= max_size:
            size += len(units[end])
            end += 1
        chunks.append("".join(units[start:end]))
        if end == len(units):
            break
        start = max(end - overlap, start + 1)
    return chunks


def _merge_short_chunks(chunks: list[_RawChunk], min_size: int, max_size: int) -> list[_RawChunk]:
    merged: list[_RawChunk] = []
    for chunk in chunks:
        if _can_merge_short_chunk(chunk, merged, min_size, max_size):
            previous = merged[-1]
            merged[-1] = _RawChunk(
                previous.text + chunk.text,
                previous.locator_type,
                previous.locator_value,
                previous.heading,
                max(previous.level, chunk.level),
            )
        else:
            merged.append(chunk)
    return merged


def _can_merge_short_chunk(
    chunk: _RawChunk, merged: list[_RawChunk], min_size: int, max_size: int
) -> bool:
    if len(chunk.text) >= min_size or not merged or chunk.level >= 3:
        return False
    previous = merged[-1]
    return (
        previous.level < 3
        and previous.heading == chunk.heading
        and previous.locator_type == chunk.locator_type
        and previous.locator_value == chunk.locator_value
        and len(previous.text) + len(chunk.text) <= max_size
    )


def _to_chunk_results(chunks: list[_RawChunk]) -> list[ChunkResult]:
    return [
        ChunkResult(
            chunk_index=index,
            text=chunk.text,
            locator_type=chunk.locator_type,
            locator_value=chunk.locator_value,
            content_hash=compute_hash(chunk.text),
            section_heading=chunk.heading,
            chunk_level=chunk.level,
        )
        for index, chunk in enumerate(chunks, start=1)
    ]


def chunk_extracted_chunks(
    extracted_chunks: list[ExtractedChunk],
    max_chunk_size: int = DEFAULT_MAX_CHUNK_SIZE,
    overlap: int = 50,
) -> list[ChunkResult]:
    """Legacy chunking adapter for backward compatibility."""
    if overlap < 0:
        raise ValueError("Chunk overlap must be non-negative.")
    blocks = [
        ExtractedBlock(
            text=item.text,
            block_type="PARAGRAPH",
            heading_level=None,
            locator_type=item.locator_type,
            locator_value=item.locator_value,
            content_hash=item.content_hash,
            source_page_or_index=index,
        )
        for index, item in enumerate(extracted_chunks, start=1)
    ]
    return chunk_blocks_hybrid(blocks, max_chunk_size=max_chunk_size)
