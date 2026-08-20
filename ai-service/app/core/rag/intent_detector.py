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


_CACHED_RULES: list[tuple[IntentEnum, str, str, list[str]]] | None = None
_CACHED_HASH: str | None = None


def get_config_hash() -> str:
    yaml_path = Path(__file__).parent.parent.parent / "config" / "adaptive-retrieval-v1.yml"
    if yaml_path.exists():
        content = yaml_path.read_bytes()
        return hashlib.sha256(content).hexdigest()[:16]
    return "v1.0-default"


def _load_rules() -> list[tuple[IntentEnum, str, str, list[str]]]:
    """Load intent rules from YAML config with in-memory caching."""
    global _CACHED_RULES, _CACHED_HASH
    current_hash = get_config_hash()

    if _CACHED_RULES is not None and _CACHED_HASH == current_hash:
        return _CACHED_RULES

    yaml_path = Path(__file__).parent.parent.parent / "config" / "adaptive-retrieval-v1.yml"
    if yaml_path.exists():
        try:
            with yaml_path.open("r", encoding="utf-8") as f:
                config = yaml.safe_load(f)

            intents_cfg = config.get("intents", {})
            sorted_intents = sorted(intents_cfg.items(), key=lambda x: x[1].get("priority", 99))
            rules: list[tuple[IntentEnum, str, str, list[str]]] = []

            for intent_name, item in sorted_intents:
                try:
                    intent_enum = IntentEnum(intent_name)
                except ValueError:
                    continue
                rule_id = str(item.get("rule_id", f"RULE_{intent_name}"))
                patterns = item.get("patterns", [])
                combined_pattern = "|".join(patterns) if patterns else ""
                neg_patterns = item.get("negative_patterns", []) or []
                rules.append((intent_enum, rule_id, combined_pattern, neg_patterns))

            _CACHED_RULES = rules
            _CACHED_HASH = current_hash
            return rules
        except Exception:
            pass

    # Hardcoded fallback rules if YAML loading fails
    fallback_rules: list[tuple[IntentEnum, str, str, list[str]]] = [
        (IntentEnum.OUT_OF_SCOPE, "RULE_OOS_HACK", r"(hack|override|jailbreak|giai ma mat khau|tan cong|system prompt)", []),
        (IntentEnum.COMPARISON, "RULE_COMPARE_VS", r"(so sanh|khac nhau|giong nhau|uu nhược diem|uu va nhieu|giua .* va .*|khac gi)", []),
        (IntentEnum.SUMMARY, "RULE_SUMMARY_ALL", r"(tom tat|tong quan|y chinh|noi dung chinh|tom luoc)", []),
        (IntentEnum.DEFINITION, "RULE_DEF_WHAT", r"(la gi|dinh nghia|khai niem|the nao la)", []),
        (IntentEnum.REASONING, "RULE_REASON_WHY", r"(tai sao|vi sao|nguyen nhan|anh huong|tac dong|nhu the nao)", []),
        (IntentEnum.FACT, "RULE_FACT_EXPLICIT", r"(\bai\b|khi nao|bao nhieu|o dau|thoi gian|ngay thang|nam nao|may gio)", [r"(tai sao|vi sao|the nao)"]),
    ]
    _CACHED_RULES = fallback_rules
    _CACHED_HASH = current_hash
    return fallback_rules


def detect_intent(question: str) -> IntentResult:
    config_hash = get_config_hash()
    if not (3 <= len(question.strip()) <= 2000):
        return IntentResult(IntentEnum.OUT_OF_SCOPE, "RULE_INVALID_LENGTH", 1.0, question.strip(), config_hash)

    normalized = unicodedata.normalize("NFC", question.strip())
    shadow_text = remove_vietnamese_accent(normalized)

    # Check for ambiguous context-dependent pronouns (requires CLARIFY before retrieval)
    if re.search(r"^(cai do|no|thang do|cho do|cho nay) (la gi|nhu the nao)$", shadow_text):
        return IntentResult(IntentEnum.CLARIFY, "RULE_AMBIGUOUS_PRONOUN", 0.95, normalized, config_hash)

    rules = _load_rules()
    for intent, rule_id, pattern, negative_patterns in rules:
        if not pattern:
            continue
        if re.search(pattern, shadow_text):
            is_negated = any(re.search(neg, shadow_text) for neg in negative_patterns if neg)
            if not is_negated:
                return IntentResult(intent, rule_id, 0.90, normalized, config_hash)

    # Fallback to FACT
    return IntentResult(IntentEnum.FACT, "FACT_DEFAULT", 0.70, normalized, config_hash)

