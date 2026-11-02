"""RabbitMQ worker for source-complete workspace summaries."""

import json
import logging
import threading
import time
from typing import Any

import pika  # type: ignore[import-untyped]
from pika.adapters.blocking_connection import BlockingChannel  # type: ignore[import-untyped]
from pika.spec import Basic, BasicProperties  # type: ignore[import-untyped]

from app.core.private_core import call_core
from app.core.rag.contracts import SourceVersion
from app.core.rag.generation_policy import GenerationPolicy
from app.core.rag.workspace_summary import cited_sources, summarize_document, summarize_workspace
from app.core.settings import Settings, get_settings
from app.services.vector_store import (
    get_document_chunks_exact,
)
from app.services.workspace_summary_broker import connection_parameters
from app.services.workspace_summary_failures import handle_failure
from app.services.workspace_summary_lease import WorkspaceSummaryLease

logger = logging.getLogger(__name__)
SUMMARY_QUEUE = "unichat.workspace-summary.queue"


def _process_message(payload: dict[str, Any], settings: Settings) -> None:
    operation_id = str(payload["operationId"])
    request_id = str(payload["requestId"])
    fingerprint = str(payload["sourceFingerprint"])
    claim = call_core(
        f"/internal/v1/workspace-summary-jobs/{operation_id}/claim",
        {"requestId": request_id, "sourceFingerprint": fingerprint},
        request_id,
        f"{operation_id}:claim",
    )
    sources = [SourceVersion.model_validate(source) for source in claim.get("sources", [])]
    policy = GenerationPolicy(request_id, operation_id, True, time.time() + 7200)
    with WorkspaceSummaryLease(operation_id, request_id) as lease:
        try:
            document_summaries = _summarize_sources(claim, sources, policy, settings, lease)
            final = summarize_workspace(
                [{key: value for key, value in item.items() if key != "sources"}
                 for item in document_summaries],
                policy,
                settings.workspace_summary_input_char_budget,
                lease.cancelled,
            )
            lease.check()
            _publish_completion(operation_id, request_id, fingerprint, final, document_summaries)
        except Exception:
            lease.check()
            raise


def _summarize_sources(
    claim: dict[str, Any],
    sources: list[SourceVersion],
    policy: GenerationPolicy,
    settings: Settings,
    lease: WorkspaceSummaryLease,
) -> list[dict[str, Any]]:
    total_chunks = sum(source.indexedChunkCount or 0 for source in sources)
    processed_chunks = 0
    summaries: list[dict[str, Any]] = []
    completed = {str(item["documentId"]): item for item in claim.get("completedDocuments", [])}
    for index, source in enumerate(sources, start=1):
        lease.check()
        previous = completed.get(str(source.documentId))
        if previous is not None:
            if previous.get("processedChunkCount") != source.indexedChunkCount:
                raise ValueError("SUMMARY_INCOMPLETE")
            summaries.append(previous)
            processed_chunks += source.indexedChunkCount or 0
            _progress(claim, "DOCUMENT_REDUCE", index, processed_chunks, 0)
            continue
        _progress(claim, "READING_CHUNKS", index - 1, processed_chunks, 0)
        chunks = get_document_chunks_exact(
            str(claim["workspaceId"]),
            str(source.documentId),
            source.ingestionVersion,
            source.contentHash,
            source.indexedChunkCount or 0,
        )
        if sum(len(chunk.text) for chunk in chunks) != source.indexedCharacterCount:
            raise ValueError("SUMMARY_INCOMPLETE")
        _progress(claim, "MAPPING", index - 1, processed_chunks, 0)
        summary = summarize_document(
            str(source.documentId),
            source.fileName,
            chunks,
            policy,
            settings.workspace_summary_input_char_budget,
            lease.cancelled,
        )
        summary["sources"] = cited_sources(chunks, summary["claims"], source.ingestionVersion)
        lease.check()
        _checkpoint_document(claim, summary)
        summaries.append(summary)
        processed_chunks += len(chunks)
        _progress(claim, "DOCUMENT_REDUCE", index, processed_chunks, 0)
    if processed_chunks != total_chunks:
        raise ValueError("SUMMARY_INCOMPLETE")
    return summaries


def _checkpoint_document(claim: dict[str, Any], summary: dict[str, Any]) -> None:
    operation_id = str(claim["operationId"])
    request_id = str(claim["requestId"])
    call_core(
        f"/internal/v1/workspace-summary-jobs/{operation_id}/documents/checkpoint",
        {
            "requestId": request_id,
            "sourceFingerprint": str(claim["sourceFingerprint"]),
            "document": summary,
        },
        request_id,
        f"{operation_id}:checkpoint:{summary['documentId']}",
        timeout_seconds=30.0,
    )


def _progress(
    claim: dict[str, Any],
    stage: str,
    documents_completed: int,
    chunks_processed: int,
    provider_calls_completed: int,
) -> None:
    operation_id = str(claim["operationId"])
    request_id = str(claim["requestId"])
    call_core(
        f"/internal/v1/workspace-summary-jobs/{operation_id}/progress",
        {
            "requestId": request_id,
            "stage": stage,
            "documentsCompleted": documents_completed,
            "chunksProcessed": chunks_processed,
            "providerCallsCompleted": provider_calls_completed,
        },
        request_id,
        f"{operation_id}:progress:{stage}:{documents_completed}:{chunks_processed}",
    )


def _publish_completion(
    operation_id: str,
    request_id: str,
    fingerprint: str,
    final: Any,
    document_summaries: list[dict[str, Any]],
) -> None:
    _progress(
        {"operationId": operation_id, "requestId": request_id},
        "WORKSPACE_REDUCE",
        len(document_summaries),
        sum(summary["processedChunkCount"] for summary in document_summaries),
        0,
    )
    payload = {
        "requestId": request_id,
        "sourceFingerprint": fingerprint,
        "overview": final.overview,
        "overviewChunkIds": final.overviewChunkIds,
        "crossDocumentInsights": [item.model_dump() for item in final.insights],
        "documents": document_summaries,
        "processedChunkCount": sum(
            summary["processedChunkCount"] for summary in document_summaries
        ),
    }
    call_core(
        f"/internal/v1/workspace-summary-jobs/{operation_id}/complete",
        payload,
        request_id,
        f"{operation_id}:complete",
        timeout_seconds=30.0,
    )


def _on_message(
    channel: BlockingChannel,
    method: Basic.Deliver,
    properties: BasicProperties,
    body: bytes,
) -> None:
    try:
        payload = json.loads(body)
        _process_message(payload, get_settings())
        channel.basic_ack(delivery_tag=method.delivery_tag)
    except Exception as error:
        logger.error("workspace_summary_worker_failed errorCode=%s", type(error).__name__)
        handle_failure(channel, method, properties, body, error)


def start_summary_consumer_thread(rabbitmq_url: str) -> threading.Thread:
    """Start a durable, single-flight worker thread for summary jobs."""
    thread = threading.Thread(
        target=_start_consumer, args=(rabbitmq_url,), name="workspace-summary-consumer", daemon=True
    )
    thread.start()
    return thread


def _start_consumer(rabbitmq_url: str) -> None:
    connection = pika.BlockingConnection(connection_parameters(rabbitmq_url))
    channel = connection.channel()
    channel.queue_declare(queue=SUMMARY_QUEUE, durable=True)
    channel.confirm_delivery()
    channel.basic_qos(prefetch_count=1)
    channel.basic_consume(queue=SUMMARY_QUEUE, on_message_callback=_on_message)
    channel.start_consuming()
