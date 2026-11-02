"""Durable retry and terminal failure classification for summary delivery."""

import json
import logging
from typing import Any

from pika.adapters.blocking_connection import BlockingChannel  # type: ignore[import-untyped]
from pika.spec import Basic, BasicProperties  # type: ignore[import-untyped]

from app.core.private_core import call_core
from app.core.rag.provider_contracts import ProviderFailure
from app.core.service_security import ServiceSecurityError
from app.services.vector_store import VectorStoreIncompleteError, VectorStoreUnavailableError

logger = logging.getLogger(__name__)
RETRY_QUEUES = (
    (10, "unichat.workspace-summary.retry.10s"),
    (60, "unichat.workspace-summary.retry.60s"),
    (300, "unichat.workspace-summary.retry.300s"),
)
SUMMARY_DLQ = "unichat.workspace-summary.dlq"
TERMINAL_CODES = {
    "SUMMARY_INCOMPLETE",
    "SUMMARY_SOURCE_SNAPSHOT_CHANGED",
    "SUMMARY_CITATION_INVALID",
    "SUMMARY_CHECKPOINT_CONFLICT",
}


def handle_failure(
    channel: BlockingChannel,
    method: Basic.Deliver,
    properties: BasicProperties,
    body: bytes,
    error: Exception,
) -> None:
    """Acknowledge only after a confirmed retry or terminal failure report."""
    code = failure_code(error)
    if code in {"SUMMARY_WORKER_ALREADY_CLAIMED", "SUMMARY_OPERATION_TERMINAL"}:
        channel.basic_ack(delivery_tag=method.delivery_tag)
        return
    try:
        payload = json.loads(body)
        attempts = int((properties.headers or {}).get("x-summary-retry", 0))
        if code not in TERMINAL_CODES and attempts < len(RETRY_QUEUES):
            schedule_retry(channel, payload, body, attempts)
        else:
            report_failure(payload, code)
            channel.basic_publish(
                exchange="",
                routing_key=SUMMARY_DLQ,
                body=body,
                properties=BasicProperties(delivery_mode=2, headers={"errorCode": code}),
            )
        channel.basic_ack(delivery_tag=method.delivery_tag)
    except Exception:
        logger.error("workspace_summary_failure_delivery_unavailable errorCode=%s", code)
        channel.basic_nack(delivery_tag=method.delivery_tag, requeue=True)


def schedule_retry(
    channel: BlockingChannel, payload: dict[str, Any], body: bytes, attempts: int
) -> None:
    """Publish one delayed retry after Core extends the bounded lease."""
    delay, queue = RETRY_QUEUES[attempts]
    operation_id = str(payload["operationId"])
    request_id = str(payload["requestId"])
    call_core(
        f"/internal/v1/workspace-summary-jobs/{operation_id}/retry",
        {"requestId": request_id, "delaySeconds": delay},
        request_id,
        f"{operation_id}:retry:{attempts}",
    )
    channel.basic_publish(
        exchange="",
        routing_key=queue,
        body=body,
        properties=BasicProperties(delivery_mode=2, headers={"x-summary-retry": attempts + 1}),
    )


def report_failure(payload: dict[str, Any], code: str) -> None:
    """Persist a typed terminal failure without user-visible partial output."""
    operation_id = str(payload["operationId"])
    request_id = str(payload["requestId"])
    call_core(
        f"/internal/v1/workspace-summary-jobs/{operation_id}/fail",
        {"requestId": request_id, "errorCode": code},
        request_id,
        f"{operation_id}:fail",
    )


def failure_code(error: Exception) -> str:
    """Expose only safe machine codes to Core and the dead-letter queue."""
    if isinstance(error, (VectorStoreIncompleteError, ValueError)):
        return "SUMMARY_INCOMPLETE"
    if isinstance(error, VectorStoreUnavailableError):
        return "RETRIEVAL_UNAVAILABLE"
    if isinstance(error, ServiceSecurityError) and str(error) in TERMINAL_CODES | {
        "SUMMARY_WORKER_ALREADY_CLAIMED",
        "SUMMARY_OPERATION_TERMINAL",
    }:
        return str(error)
    if isinstance(error, ServiceSecurityError) and str(error) in {
        "SUMMARY_SCOPE_NOT_AUTHORIZED",
        "SUMMARY_MANIFEST_MISSING",
        "SUMMARY_SOURCES_NOT_READY",
    }:
        return "SUMMARY_SOURCE_SNAPSHOT_CHANGED"
    if isinstance(error, ProviderFailure) and error.transient:
        return "SUMMARY_PROCESSING_FAILED"
    return "SUMMARY_PROCESSING_FAILED"
