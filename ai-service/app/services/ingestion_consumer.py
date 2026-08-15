"""Processes document ingestion messages from RabbitMQ.

Supports reading document files from local disk or Supabase Storage
depending on the ``STORAGE_PROVIDER`` environment setting.
"""

import logging
import os
from typing import Any

import httpx

from app.core.settings import get_settings
from app.services.chunker import chunk_blocks_hybrid
from app.services.rabbitmq_publisher import publish_ingestion_result
from app.services.text_extractor import extract_blocks
from app.services.vector_store import store_document_chunks

logger = logging.getLogger(__name__)


def _read_file_local(storage_key: str) -> bytes:
    """Read document bytes from local filesystem."""
    settings = get_settings()
    storage_dir = settings.storage_dir
    file_path = os.path.join(storage_dir, storage_key)

    if not os.path.exists(file_path):
        raise FileNotFoundError(f"File not found at path: {file_path}")

    with open(file_path, "rb") as f:
        return f.read()


def _read_file_supabase(storage_key: str) -> bytes:
    """Download document bytes from Supabase Storage."""
    settings = get_settings()
    url = (
        f"{settings.supabase_storage_url}/object/authenticated"
        f"/{settings.supabase_storage_bucket}/{storage_key}"
    )
    response = httpx.get(
        url,
        headers={
            "Authorization": f"Bearer {settings.supabase_service_key}",
            "apikey": settings.supabase_service_key,
        },
        timeout=30.0,
    )
    response.raise_for_status()
    return response.content


def _read_file(storage_key: str) -> bytes:
    """Read document bytes using the configured storage provider."""
    settings = get_settings()
    if settings.storage_provider == "supabase":
        return _read_file_supabase(storage_key)
    return _read_file_local(storage_key)


def process_ingestion_message(payload: dict[str, Any]) -> bool:
    """Process a single ingestion message payload.

    Returns True on success, False on failure.
    """
    document_id = str(payload.get("documentId") or "")
    workspace_id = str(payload.get("workspaceId") or "")
    storage_key = str(payload.get("storageKey") or "")
    media_type = str(payload.get("mediaType") or "")

    logger.info("Received ingestion task for document: %s, workspace: %s", document_id, workspace_id)

    try:
        file_bytes = _read_file(storage_key)

        # 1. Extract structured blocks with headings
        blocks = extract_blocks(file_bytes, media_type)

        # 2. Hybrid 3-level chunking
        chunks = chunk_blocks_hybrid(blocks)

        # 3. Vector embedding & ChromaDB insertion
        stored_count = store_document_chunks(
            workspace_id=workspace_id,
            document_id=document_id,
            chunks=chunks,
        )

        logger.info("Successfully indexed %d vector chunks for document %s", stored_count, document_id)
        publish_ingestion_result(document_id, success=True, chunk_count=stored_count)
        return True

    except Exception as e:
        logger.exception("Failed ingestion for document %s", document_id)
        publish_ingestion_result(document_id, success=False, chunk_count=0, error_message=str(e))
        return False

