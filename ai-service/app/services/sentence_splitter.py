"""Vietnamese-aware sentence splitter module."""

import re
import unicodedata

ABBREVIATIONS = (
    "TP.",
    "PGS.",
    "TS.",
    "ThS.",
    "GS.",
    "v.v.",
    "tr.",
    "NXB.",
    "Stt.",
    "Dr.",
    "Mr.",
    "Mrs.",
    "Ms.",
    "Prof.",
    "Co.",
    "Ltd.",
    "Inc.",
    "Vol.",
    "No.",
    "Fig.",
)

# Placeholder token to avoid splitting on abbreviations
ABBR_TOKEN_PREFIX = "___ABBR_"


def split_sentences(text: str) -> list[str]:
    """Split text into sentences while preserving Vietnamese abbreviations and full diacritics.

    Args:
        text: Input raw text.

    Returns:
        List of non-empty sentences.
    """
    if not text or not text.strip():
        return []

    # 1. NFC Normalize
    normalized = unicodedata.normalize("NFC", text)

    # 2. Replace abbreviations with temporary tokens
    abbr_map: dict[str, str] = {}
    temp_text = normalized

    for idx, abbr in enumerate(ABBREVIATIONS):
        token = f"{ABBR_TOKEN_PREFIX}{idx}___"
        if abbr in temp_text:
            abbr_map[token] = abbr
            temp_text = temp_text.replace(abbr, token)

    # Handle "Điều X.", "Khoản Y." patterns
    dieu_pattern = re.compile(r"\b(Điều|Khoản|Mục|Chương)\s+(\d+|[IVXLC]+)\.")

    def _replace_dieu(m: re.Match[str]) -> str:
        token = f"___DIEU_{len(abbr_map)}___"
        abbr_map[token] = m.group(0)
        return token

    temp_text = dieu_pattern.sub(_replace_dieu, temp_text)

    # 3. Split by sentence terminators (. ! ? \n\n ;\n)
    # Split regex matches period, exclaim, question mark followed by space or newline
    raw_splits = re.split(r"(?<=[.!?])\s+|\n\n+|;\n+", temp_text)

    sentences: list[str] = []
    for s in raw_splits:
        # Restore abbreviation tokens
        restored = s
        for token, original in abbr_map.items():
            restored = restored.replace(token, original)

        stripped = restored.strip()
        if stripped:
            sentences.append(stripped)

    return sentences
