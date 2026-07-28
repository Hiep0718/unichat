import re
import unicodedata
from enum import Enum
from typing import Dict, List, Tuple

class IntentEnum(str, Enum):
    OUT_OF_SCOPE = "OUT_OF_SCOPE"
    COMPARISON = "COMPARISON"
    SUMMARY = "SUMMARY"
    DEFINITION = "DEFINITION"
    REASONING = "REASONING"
    FACT = "FACT"

class IntentResult:
    def __init__(self, intent: IntentEnum, rule_id: str, confidence: float, normalized_text: str):
        self.intent = intent
        self.rule_id = rule_id
        self.confidence = confidence
        self.normalized_text = normalized_text

    def to_dict(self) -> Dict[str, str | float]:
        return {
            "intent": self.intent.value,
            "rule_id": self.rule_id,
            "confidence": self.confidence,
            "normalized_text": self.normalized_text,
        }

def remove_vietnamese_accent(text: str) -> str:
    s = unicodedata.normalize("NFD", text)
    s = "".join([c for c in s if unicodedata.category(c) != "Mn"])
    s = s.replace("đ", "d").replace("Đ", "D")
    return s.lower()

PATTERNS: List[Tuple[IntentEnum, str, str]] = [
    # (Intent, RuleId, Regex Pattern on shadow text)
    (IntentEnum.OUT_OF_SCOPE, "RULE_OOS_HACK", r"(hack|override|jailbreak|giai ma mat khau|tan cong)"),
    (IntentEnum.COMPARISON, "RULE_COMPARE_VS", r"(so sanh|khac nhau|giong nhau|uu nhược diem|uu va nhieu|giua .* va .*)"),
    (IntentEnum.SUMMARY, "RULE_SUMMARY_ALL", r"(tom tat|tong quan|y chinh|noi dung chinh|tom luoc)"),
    (IntentEnum.DEFINITION, "RULE_DEF_WHAT", r"(la gi|dinh nghia|khai niem|the nao la)"),
    (IntentEnum.REASONING, "RULE_REASON_WHY", r"(tai sao|vi sao|nguyen nhan|anh huong|tac dong|nhu the nao)"),
    (IntentEnum.FACT, "RULE_FACT_EXPLICIT", r"(ai|khi nao|bao nhieu|o dau|thoi gian|ngay thang)"),
]

def detect_intent(question: str) -> IntentResult:
    if not (3 <= len(question.strip()) <= 2000):
        return IntentResult(IntentEnum.OUT_OF_SCOPE, "RULE_INVALID_LENGTH", 1.0, question.strip())

    normalized = unicodedata.normalize("NFC", question.strip())
    shadow_text = remove_vietnamese_accent(normalized)

    for intent, rule_id, pattern in PATTERNS:
        if re.search(pattern, shadow_text):
            return IntentResult(intent, rule_id, 0.90, normalized)

    # Fallback to FACT
    return IntentResult(IntentEnum.FACT, "FACT_DEFAULT", 0.70, normalized)
