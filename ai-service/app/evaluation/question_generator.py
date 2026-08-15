"""Anti-bias question generator reading chunks directly from ChromaDB (R-10 / R-21)."""

import json
from enum import StrEnum
from typing import Any

import structlog

from app.services.vector_store import COLLECTION_V2, get_chroma_client

logger = structlog.get_logger(__name__)


class QuestionCategory(StrEnum):
    DIRECT = "DIRECT"
    PARAPHRASED = "PARAPHRASED"
    ADVERSARIAL = "ADVERSARIAL"
    OUT_OF_SCOPE = "OUT_OF_SCOPE"


def load_chunks_from_chroma(workspace_id: str, collection_name: str = COLLECTION_V2) -> list[dict[str, Any]]:
    """Load all chunks for a workspace directly from ChromaDB (R-21 mitigation)."""
    client = get_chroma_client()
    try:
        col = client.get_collection(collection_name)
        res = col.get(
            where={"workspace_id": {"$eq": workspace_id}},
            include=["documents", "metadatas"],
        )
        items: list[dict[str, Any]] = []
        if res and res.get("documents"):
            for doc, meta, cid in zip(res["documents"], res["metadatas"], res["ids"]):
                items.append({"chunk_id": cid, "text": doc, "metadata": meta})
        return items
    except Exception as e:
        logger.warning("Could not fetch chunks from Chroma collection", error=str(e))
        return []


def generate_draft_dataset(
    workspace_id: str,
    total_cases: int = 120,
    collection_name: str = COLLECTION_V2,
) -> list[dict[str, Any]]:
    """Generate semi-automated draft evaluation cases (R-10 anti-bias breakdown)."""
    chunks = load_chunks_from_chroma(workspace_id, collection_name=collection_name)

    n_direct = int(total_cases * 0.60)
    n_paraphrased = int(total_cases * 0.20)
    n_adversarial = int(total_cases * 0.10)
    n_out_of_scope = total_cases - (n_direct + n_paraphrased + n_adversarial)

    cases: list[dict[str, Any]] = []
    case_counter = 1

    # Direct & Paraphrased generated from chunks
    chunk_idx = 0
    num_chunks = len(chunks)

    for i in range(n_direct):
        c_info = chunks[chunk_idx % num_chunks] if num_chunks > 0 else {}
        cases.append({
            "case_id": f"CASE-{case_counter:03d}",
            "category": QuestionCategory.DIRECT,
            "question": f"Quy định trong đoạn: {c_info.get('text', '')[:50]}... là gì?",
            "expected_intent": "FACT",
            "evidence_label": "SUFFICIENT",
            "target_chunk_ids": [c_info.get("chunk_id", "c1")] if c_info else [],
            "auto_generated": True,
        })
        case_counter += 1
        chunk_idx += 1

    for i in range(n_paraphrased):
        c_info = chunks[chunk_idx % num_chunks] if num_chunks > 0 else {}
        cases.append({
            "case_id": f"CASE-{case_counter:03d}",
            "category": QuestionCategory.PARAPHRASED,
            "question": f"Tóm tắt nội dung chính liên quan đến {c_info.get('text', '')[:40]}",
            "expected_intent": "SUMMARY",
            "evidence_label": "SUFFICIENT",
            "target_chunk_ids": [c_info.get("chunk_id", "c1")] if c_info else [],
            "auto_generated": True,
        })
        case_counter += 1
        chunk_idx += 1

    # Adversarial (Needs manual editing by user)
    for i in range(n_adversarial):
        cases.append({
            "case_id": f"CASE-{case_counter:03d}",
            "category": QuestionCategory.ADVERSARIAL,
            "question": f"[Vui lòng tự biên soạn câu hỏi thiếu căn cứ #{i+1}]",
            "expected_intent": "REASONING",
            "evidence_label": "INSUFFICIENT",
            "target_chunk_ids": [],
            "auto_generated": False,
        })
        case_counter += 1

    # Out of scope (Needs manual editing by user)
    for i in range(n_out_of_scope):
        cases.append({
            "case_id": f"CASE-{case_counter:03d}",
            "category": QuestionCategory.OUT_OF_SCOPE,
            "question": f"[Vui lòng tự biên soạn câu hỏi ngoài phạm vi #{i+1}]",
            "expected_intent": "OUT_OF_SCOPE",
            "evidence_label": "OUT_OF_SCOPE",
            "target_chunk_ids": [],
            "auto_generated": False,
        })
        case_counter += 1

    return cases
