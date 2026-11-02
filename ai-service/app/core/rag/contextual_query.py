"""Bounded retrieval context for explicit follow-up questions."""

import re
import unicodedata

MAX_CONTEXT_CHARS = 1200
MAX_MESSAGE_CHARS = 500
FOLLOW_UP_CUES = re.compile(
    r"\b(?:nó|đó|đấy|đây|này|vậy|thế|còn|"
    r"ý\s+(?:thứ|trên)|phần\s+(?:này|đó)|cái\s+(?:đó|này)|"
    r"it|that|those|these|they|them|their|this|same|former|latter|"
    r"what\s+about|how\s+about)\b",
    re.IGNORECASE,
)


def build_contextual_query(
    question: str, history: list[dict[str, str]], summary: str | None
) -> str | None:
    """Compose one bounded retrieval-only query when validated context resolves a follow-up."""
    normalized = unicodedata.normalize("NFC", question).casefold()
    if not FOLLOW_UP_CUES.search(normalized):
        return None
    excerpts = [_excerpt(summary or "")]
    excerpts.extend(_excerpt(message.get("content", "")) for message in history[-4:])
    context = "\n".join(part for part in excerpts if part)[-MAX_CONTEXT_CHARS:]
    if not context:
        return None
    return f"Conversation context:\n{context}\nFollow-up question: {question.strip()}"


def _excerpt(text: str) -> str:
    cleaned = " ".join(text.split())
    return cleaned[:MAX_MESSAGE_CHARS]
