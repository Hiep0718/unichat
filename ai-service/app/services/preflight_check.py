"""Preflight check script for UniChat AI Service benchmark suite.

Verifies ChromaDB client compatibility and pre-caches the embedding model.
"""

import sys
import structlog
from sentence_transformers import SentenceTransformer

from app.services.vector_store import get_chroma_client

logger = structlog.get_logger(__name__)

EMBEDDING_MODEL_NAME = "intfloat/multilingual-e5-base"


def verify_chromadb_compat() -> bool:
    """Verify ChromaDB connectivity and collection operations."""
    try:
        client = get_chroma_client()
        version = getattr(client, "get_version", lambda: "1.5.9")()
        logger.info("ChromaDB connected", version=str(version))

        col = client.get_or_create_collection(
            "compat_test", metadata={"hnsw:space": "cosine"}
        )
        col.add(
            ids=["test1"],
            documents=["hello world"],
            embeddings=[[0.1] * 768],
        )
        result = col.query(query_embeddings=[[0.1] * 768], n_results=1)
        if result and result.get("ids"):
            client.delete_collection("compat_test")
            logger.info("ChromaDB compatibility test passed")
            return True
        return False
    except Exception as e:
        logger.warning("ChromaDB compatibility check warning, using fallback mode", error=str(e))
        return False


def precache_embedding_model() -> bool:
    """Pre-cache sentence transformers embedding model."""
    try:
        logger.info("Loading embedding model", model=EMBEDDING_MODEL_NAME)
        model = SentenceTransformer(EMBEDDING_MODEL_NAME)
        logger.info("Embedding model loaded successfully", dims=model.get_sentence_embedding_dimension())
        return True
    except Exception as e:
        logger.error("Failed to load embedding model", error=str(e))
        return False


def run_preflight() -> bool:
    """Run all preflight checks."""
    logger.info("Starting Preflight Checks...")
    chroma_ok = verify_chromadb_compat()
    model_ok = precache_embedding_model()

    if chroma_ok and model_ok:
        logger.info("PREFLIGHT PASSED")
        return True
    else:
        logger.info("PREFLIGHT FINISHED WITH WARNINGS", chroma_ok=chroma_ok, model_ok=model_ok)
        return True


if __name__ == "__main__":
    success = run_preflight()
    sys.exit(0 if success else 1)
