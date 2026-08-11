"""Re-ingestion script for document vector collections (R-18)."""

import argparse
import sys
from typing import Any

import structlog

from app.services.chunker import chunk_blocks_hybrid
from app.services.text_extractor import extract_blocks
from app.services.vector_store import COLLECTION_V2, store_document_chunks

logger = structlog.get_logger(__name__)


def reingest_document(
    workspace_id: str,
    document_id: str,
    file_bytes: bytes,
    media_type: str,
    target_collection: str = COLLECTION_V2,
) -> int:
    """Extract, chunk with hybrid 3-level chunker, embed and store in target collection."""
    logger.info(
        "Re-ingesting document",
        workspace_id=workspace_id,
        document_id=document_id,
        media_type=media_type,
        collection=target_collection,
    )

    blocks = extract_blocks(file_bytes, media_type)
    chunks = chunk_blocks_hybrid(blocks)
    count = store_document_chunks(
        workspace_id=workspace_id,
        document_id=document_id,
        chunks=chunks,
        target_collection=target_collection,
    )

    logger.info(
        "Re-ingestion completed",
        workspace_id=workspace_id,
        document_id=document_id,
        stored_chunks=count,
        collection=target_collection,
    )
    return count


def main() -> None:
    parser = argparse.ArgumentParser(description="Re-ingest workspace documents into target Chroma collection.")
    parser.add_argument("--workspace-id", required=True, help="Target workspace ID")
    parser.add_argument("--collection", default=COLLECTION_V2, help="Target ChromaDB collection name")
    args = parser.parse_args()

    logger.info("Starting batch re-ingestion", workspace_id=args.workspace_id, collection=args.collection)
    # Placeholder for batch workspace document fetching when invoked standalone
    print(f"Re-ingestion ready for workspace {args.workspace_id} on collection {args.collection}")


if __name__ == "__main__":
    main()
