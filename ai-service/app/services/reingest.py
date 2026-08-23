"""Re-ingestion script for document vector collections (R-18)."""

import argparse
import os
from pathlib import Path
from typing import Any

import structlog

from app.services.chunker import chunk_blocks_hybrid
from app.services.text_extractor import extract_blocks
from app.services.vector_store import COLLECTION_V1, COLLECTION_V2, store_document_chunks

import httpx

from app.core.settings import get_settings

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


from app.services.sync_tracker import global_sync_tracker


def _reingest_all_supabase() -> dict[str, Any]:
    """Scan Supabase Storage bucket and re-ingest all stored workspace documents into ChromaDB."""
    settings = get_settings()
    list_url = f"{settings.supabase_storage_url}/object/list/{settings.supabase_storage_bucket}"
    headers = {
        "Authorization": f"Bearer {settings.supabase_service_key}",
        "apikey": settings.supabase_service_key,
    }

    global_sync_tracker.start_sync()

    try:
        res = httpx.post(list_url, headers=headers, json={"prefix": "", "limit": 100}, timeout=30.0)
        res.raise_for_status()
        workspace_folders = res.json()
    except Exception as e:
        logger.error("Failed to list Supabase storage workspace folders", error=str(e))
        global_sync_tracker.fail_sync(str(e))
        return {"status": "SUPABASE_ERROR", "processed_files": 0, "total_chunks": 0}

    all_file_tasks = []
    for item in workspace_folders:
        folder_name = item.get("name")
        if not folder_name:
            continue

        try:
            f_res = httpx.post(list_url, headers=headers, json={"prefix": folder_name, "limit": 100}, timeout=30.0)
            f_res.raise_for_status()
            file_items = f_res.json()
            for f_item in file_items:
                file_name = f_item.get("name")
                if file_name and file_name != folder_name:
                    all_file_tasks.append((folder_name, file_name))
        except Exception:
            continue

    total_files_count = len(all_file_tasks)
    global_sync_tracker.set_total_files(total_files_count)

    processed_files = 0
    total_chunks = 0

    for folder_name, file_name in all_file_tasks:
        workspace_id = folder_name
        storage_key = f"{folder_name}/{file_name}"
        doc_id_part = file_name.split("_")[0] if "_" in file_name else file_name.split(".")[0]
        document_id = doc_id_part

        suffix = Path(file_name).suffix.lower()
        media_type = "text/plain"
        if suffix == ".pdf":
            media_type = "application/pdf"
        elif suffix == ".docx":
            media_type = "application/vnd.openxmlformats-officedocument.wordprocessingml.document"

        try:
            download_url = f"{settings.supabase_storage_url}/object/authenticated/{settings.supabase_storage_bucket}/{storage_key}"
            d_res = httpx.get(download_url, headers=headers, timeout=60.0)
            d_res.raise_for_status()
            file_bytes = d_res.content

            if file_bytes:
                c2 = reingest_document(workspace_id, document_id, file_bytes, media_type, COLLECTION_V2)
                reingest_document(workspace_id, document_id, file_bytes, media_type, COLLECTION_V1)
                processed_files += 1
                total_chunks += c2
                global_sync_tracker.update_file_progress(file_name, processed_files, c2)
        except Exception as e:
            logger.error("Failed to re-ingest Supabase file", storage_key=storage_key, error=str(e))

    global_sync_tracker.complete_sync(f"Đã hoàn tất đồng bộ {processed_files}/{total_files_count} tài liệu ({total_chunks} chunks).")

    return {
        "status": "SUCCESS",
        "storage_provider": "supabase",
        "processed_files": processed_files,
        "total_chunks": total_chunks,
    }


def reingest_all_from_storage(storage_dir_path: str | None = None) -> dict[str, Any]:
    """Scan file storage directory (Supabase or local) and re-ingest all documents into ChromaDB."""
    settings = get_settings()
    if settings.storage_provider == "supabase" and not storage_dir_path:
        return _reingest_all_supabase()

    candidates = []
    if storage_dir_path:
        candidates.append(Path(storage_dir_path))

    # Add standard dev storage paths
    base_dir = Path(__file__).resolve().parent.parent.parent.parent
    candidates.extend([
        base_dir / "core-api" / "data" / "storage",
        base_dir / "data" / "storage",
        Path("./data/storage"),
    ])

    target_dir: Path | None = None
    for p in candidates:
        if p.exists() and p.is_dir():
            target_dir = p
            break

    if not target_dir:
        logger.warning("No document storage directory found to re-ingest.")
        return {"status": "NO_STORAGE_DIR", "processed_files": 0, "total_chunks": 0}

    logger.info("Found storage directory for re-ingestion", path=str(target_dir))
    processed_files = 0
    total_chunks = 0

    for file_path in target_dir.glob("**/*"):
        if file_path.is_file():
            rel_path = file_path.relative_to(target_dir)
            parts = rel_path.parts
            if len(parts) >= 2:
                workspace_id = parts[0]
                filename = parts[-1]
                # Format: documentId_originalName.ext
                doc_id_part = filename.split("_")[0] if "_" in filename else filename.split(".")[0]
                document_id = doc_id_part

                suffix = file_path.suffix.lower()
                media_type = "text/plain"
                if suffix == ".pdf":
                    media_type = "application/pdf"
                elif suffix == ".docx":
                    media_type = "application/vnd.openxmlformats-officedocument.wordprocessingml.document"

                try:
                    with open(file_path, "rb") as f:
                        file_bytes = f.read()
                    if file_bytes:
                        c2 = reingest_document(workspace_id, document_id, file_bytes, media_type, COLLECTION_V2)
                        reingest_document(workspace_id, document_id, file_bytes, media_type, COLLECTION_V1)
                        processed_files += 1
                        total_chunks += c2
                except Exception as e:
                    logger.error("Failed to re-ingest file", file=str(file_path), error=str(e))

    return {
        "status": "SUCCESS",
        "storage_provider": "local",
        "storage_dir": str(target_dir),
        "processed_files": processed_files,
        "total_chunks": total_chunks,
    }


def main() -> None:
    parser = argparse.ArgumentParser(description="Re-ingest all stored workspace documents into ChromaDB.")
    parser.add_argument("--storage-dir", help="Path to local storage directory")
    args = parser.parse_args()

    result = reingest_all_from_storage(args.storage_dir)
    print(f"Sync complete: Processed {result['processed_files']} files, {result['total_chunks']} chunks stored in ChromaDB.")


if __name__ == "__main__":
    main()
