"""Preflight check script for UniChat AI Service benchmark suite.

Verifies ChromaDB client compatibility and pre-caches the embedding model.
"""

import sys

import structlog
from sentence_transformers import SentenceTransformer

from app.services.vector_store import get_active_collection_name, get_chroma_client

logger = structlog.get_logger(__name__)

EMBEDDING_MODEL_NAME = "intfloat/multilingual-e5-base"


def verify_chromadb_compat() -> bool:
    """Verify read-only access to the configured collection without mutating Cloud."""
    try:
        client = get_chroma_client()
        version = getattr(client, "get_version", lambda: "1.5.9")()
        logger.info("ChromaDB connected", version=str(version))
        collection = client.get_collection(name=get_active_collection_name())
        record_count = collection.count()
        logger.info("ChromaDB read-only compatibility test passed", count=record_count)
        return isinstance(record_count, int) and record_count >= 0
    except Exception as error:
        logger.warning(
            "ChromaDB compatibility check failed", error_type=type(error).__name__
        )
        return False


def precache_embedding_model() -> bool:
    """Pre-cache sentence transformers embedding model."""
    try:
        logger.info("Loading embedding model", model=EMBEDDING_MODEL_NAME)
        model = SentenceTransformer(EMBEDDING_MODEL_NAME)
        logger.info(
            "Embedding model loaded successfully",
            dims=model.get_sentence_embedding_dimension(),
        )
        return True
    except Exception as error:
        logger.error("Failed to load embedding model", error_type=type(error).__name__)
        return False


def run_preflight() -> bool:
    """Run all preflight checks."""
    logger.info("Starting Preflight Checks...")
    chroma_ok = verify_chromadb_compat()
    model_ok = precache_embedding_model()

    success = chroma_ok and model_ok
    if success:
        logger.info("PREFLIGHT PASSED")
    else:
        logger.error("PREFLIGHT FAILED", chroma_ok=chroma_ok, model_ok=model_ok)
    return success


if __name__ == "__main__":
    success = run_preflight()
    sys.exit(0 if success else 1)
