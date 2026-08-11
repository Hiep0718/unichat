import hashlib
import os
import re
import unicodedata
from enum import StrEnum
from pathlib import Path
import yaml  # type: ignore[import-untyped]


class IntentEnum(StrEnum):
    OUT_OF_SCOPE = "OUT_OF_SCOPE"
    COMPARISON = "COMPARISON"
    SUMMARY = "SUMMARY"
    DEFINITION = "DEFINITION"
    REASONING = "REASONING"
    FACT = "FACT"
    CLARIFY = "CLARIFY"


class IntentResult:
    def __init__(
        self,
        intent: IntentEnum,
        rule_id: str,
        confidence: float,
        normalized_text: str,
        config_hash: str = "",
    ) -> None:
        self.intent = intent
        self.rule_id = rule_id
        self.confidence = confidence
        self.normalized_text = normalized_text
        self.config_hash = config_hash

    def to_dict(self) -> dict[str, str | float]:
        return {
            "intent": self.intent.value,
            "rule_id": self.rule_id,
            "confidence": self.confidence,
            "normalized_text": self.normalized_text,
            "config_hash": self.config_hash,
        }


def remove_vietnamese_accent(text: str) -> str:
    s = unicodedata.normalize("NFD", text)
    s = "".join([c for c in s if unicodedata.category(c) != "Mn"])
    s = s.replace("đ", "d").replace("Đ", "D")
    return s.lower()


_CONFIG_CACHE: dict[str, str] | None = None


def get_config_hash() -> str:
    yaml_path = Path(__file__).parent.parent.parent / "config" / "adaptive-retrieval-v1.yml"
    if yaml_path.exists():
        content = yaml_path.read_bytes()
        return hashlib.sha256(content).hexdigest()[:16]
    return "v1.0-default"


PATTERNS: list[tuple[IntentEnum, str, str]] = [
    (
        IntentEnum.OUT_OF_SCOPE,
        "RULE_OOS_HACK",
        r"(hack|override|jailbreak|giai ma mat khau|tan cong|system prompt)",
    ),
    (
        IntentEnum.COMPARISON,
        "RULE_COMPARE_VS",
        r"(so sanh|khac nhau|giong nhau|uu nhược diem|uu va nhieu|giua .* va .*|khac gi)",
    ),
    (
        IntentEnum.SUMMARY,
        "RULE_SUMMARY_ALL",
        r"(tom tat|tong quan|y chinh|noi dung chinh|tom luoc)",
    ),
    (
        IntentEnum.DEFINITION,
        "RULE_DEF_WHAT",
        r"(la gi|dinh nghia|khai niem|the nao la)",
    ),
    (
        IntentEnum.REASONING,
        "RULE_REASON_WHY",
        r"(tai sao|vi sao|nguyen nhan|anh huong|tac dong|nhu the nao)",
    ),
    (
        IntentEnum.FACT,
        "RULE_FACT_EXPLICIT",
        r"(ai|khi nao|bao nhieu|o dau|thoi gian|ngay thang)",
    ),
]


def detect_intent(question: str) -> IntentResult:
    config_hash = get_config_hash()
    if not (3 <= len(question.strip()) <= 2000):
        return IntentResult(IntentEnum.OUT_OF_SCOPE, "RULE_INVALID_LENGTH", 1.0, question.strip(), config_hash)

    normalized = unicodedata.normalize("NFC", question.strip())
    shadow_text = remove_vietnamese_accent(normalized)

    # Check for ambiguous context-dependent pronouns (requires CLARIFY before retrieval)
    if re.search(r"^(cai do|no|thang do|cho do|cho nay) (la gi|nhu the nao)$", shadow_text):
        return IntentResult(IntentEnum.CLARIFY, "RULE_AMBIGUOUS_PRONOUN", 0.95, normalized, config_hash)

    for intent, rule_id, pattern in PATTERNS:
        if re.search(pattern, shadow_text):
            return IntentResult(intent, rule_id, 0.90, normalized, config_hash)

    # Fallback to FACT
    return IntentResult(IntentEnum.FACT, "FACT_DEFAULT", 0.70, normalized, config_hash)

