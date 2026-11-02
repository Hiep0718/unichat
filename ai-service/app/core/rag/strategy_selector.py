from dataclasses import dataclass

from app.core.rag.intent_detector import IntentEnum


@dataclass
class RetrievalStrategy:
    top_k: int
    similarity_floor: float
    max_chunks: int
    min_source_groups: int
    evidence_gate_threshold: float


STRATEGY_MAP = {
    IntentEnum.FACT: RetrievalStrategy(
        top_k=8,
        similarity_floor=0.70,
        max_chunks=6,
        min_source_groups=1,
        evidence_gate_threshold=0.72,
    ),
    IntentEnum.DEFINITION: RetrievalStrategy(
        top_k=6,
        similarity_floor=0.72,
        max_chunks=5,
        min_source_groups=1,
        evidence_gate_threshold=0.74,
    ),
    IntentEnum.COMPARISON: RetrievalStrategy(
        top_k=14,
        similarity_floor=0.64,
        max_chunks=10,
        min_source_groups=1,
        evidence_gate_threshold=0.68,
    ),
    IntentEnum.SUMMARY: RetrievalStrategy(
        top_k=20,
        similarity_floor=0.58,
        max_chunks=14,
        min_source_groups=1,
        evidence_gate_threshold=0.64,
    ),
    IntentEnum.REASONING: RetrievalStrategy(
        top_k=14,
        similarity_floor=0.62,
        max_chunks=10,
        min_source_groups=1,
        evidence_gate_threshold=0.68,
    ),
    IntentEnum.OUT_OF_SCOPE: RetrievalStrategy(
        top_k=0,
        similarity_floor=0.0,
        max_chunks=0,
        min_source_groups=0,
        evidence_gate_threshold=0.0,
    ),
}


def get_strategy(intent: IntentEnum) -> RetrievalStrategy:
    return STRATEGY_MAP.get(intent, STRATEGY_MAP[IntentEnum.FACT])
