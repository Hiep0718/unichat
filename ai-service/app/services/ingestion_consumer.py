import logging
import os
from typing import Any

from app.services.chunker import chunk_extracted_chunks
from app.services.text_extractor import extract_document
from app.services.vector_store import store_document_chunks

logger = logging.getLogger(__name__)

def process_ingestion_message(payload: dict[str, Any]) -> bool:
    document_id = str(payload.get("documentId") or "")
    workspace_id = str(payload.get("workspaceId") or "")
    storage_key = str(payload.get("storageKey") or "")
    media_type = str(payload.get("mediaType") or "")

    logger.info(f"Received ingestion task for document: {document_id}, workspace: {workspace_id}")

    try:
        # Read physical file from shared storage port directory
        storage_dir = os.getenv("STORAGE_DIR", "../data/storage")
        file_path = os.path.join(storage_dir, storage_key)

        if not os.path.exists(file_path):
            logger.error(f"File not found at path: {file_path}")
            return False

        with open(file_path, "rb") as f:
            file_bytes = f.read()

        # 1. Extract text & locators
        extracted_chunks = extract_document(file_bytes, media_type)

        # 2. Chunk text
        chunks = chunk_extracted_chunks(extracted_chunks)

        # 3. Vector embedding & ChromaDB insertion
        stored_count = store_document_chunks(
            workspace_id=workspace_id,
            document_id=document_id,
            chunks=chunks,
        )

        logger.info(f"Successfully indexed {stored_count} vector chunks for document {document_id}")
        return True

    except Exception as e:
        logger.error(f"Failed ingestion for document {document_id}: {str(e)}", exc_info=True)
        return False
