from app.core.rag.intent_detector import IntentEnum, detect_intent
from app.services.chunker import chunk_extracted_chunks
from app.services.text_extractor import ExtractedChunk


def test_intent_priority_comparison_over_definition():
    # Query contains both "định nghĩa" (Definition) and "so sánh" (Comparison)
    # Priority rule: COMPARISON must win over DEFINITION
    res = detect_intent("Định nghĩa và so sánh giữa thuật toán A và B")
    assert res.intent == IntentEnum.COMPARISON

def test_chunker_vietnamese_unicode_sliding_window():
    vietnamese_text = "Hệ thống UniChat hỗ trợ tri thức đại học. " * 30
    extracted = [
        ExtractedChunk(vietnamese_text, "TXT_LINE_RANGE", "lines:1-30", "hash123")
    ]

    chunks = chunk_extracted_chunks(extracted, max_chunk_size=200, overlap=30)
    assert len(chunks) > 1

    # Verify every chunk retains valid locator and hash
    for c in chunks:
        assert c.locator_type == "TXT_LINE_RANGE"
        assert c.locator_value == "lines:1-30"
        assert c.content_hash == "hash123"
        assert len(c.text) <= 200

def test_chunker_empty_input():
    chunks = chunk_extracted_chunks([])
    assert len(chunks) == 0
