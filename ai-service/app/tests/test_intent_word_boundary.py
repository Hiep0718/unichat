"""Tests for R-01 regex word boundary fix and DEFAULT_MAX_CHUNK_SIZE constant."""

from app.core.rag.intent_detector import IntentEnum, detect_intent
from app.services.chunker import DEFAULT_MAX_CHUNK_SIZE


def test_fact_ai_as_standalone_word() -> None:
    """'Ai' standing alone -> FACT."""
    res = detect_intent("Ai là tác giả của khóa luận này?")
    assert res.intent == IntentEnum.FACT


def test_reasoning_tai_sao_not_fact() -> None:
    """'Tại sao' -> REASONING, does not match FACT 'ai'."""
    res = detect_intent("Tại sao phương pháp này thất bại?")
    assert res.intent == IntentEnum.REASONING


def test_hai_not_match_fact_ai() -> None:
    """'Hai' does not match FACT 'ai' thanks to word boundary."""
    res = detect_intent("Hai phương pháp này có ưu điểm gì?")
    # Should not match FACT RULE_FACT_EXPLICIT because "hai" != "ai"
    assert res.rule_id != "RULE_FACT_EXPLICIT"


def test_sai_not_match_fact_ai() -> None:
    """'Sai lầm' does not match FACT 'ai'."""
    res = detect_intent("Sai lầm phổ biến trong quản lý dự án")
    assert res.rule_id != "RULE_FACT_EXPLICIT"


def test_default_max_chunk_size() -> None:
    """Verify DEFAULT_MAX_CHUNK_SIZE updated to 3000."""
    assert DEFAULT_MAX_CHUNK_SIZE == 3000
