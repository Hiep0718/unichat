"""Publishes ingestion results back to Core API via RabbitMQ."""

import json
import logging
import ssl
from typing import Any
from urllib.parse import urlparse

import pika  # type: ignore[import-untyped]

from app.core.settings import get_settings

logger = logging.getLogger(__name__)

RESULT_EXCHANGE = "unichat.ingestion.exchange"
RESULT_ROUTING_KEY = "document.ingestion.result"


def _build_connection_params(rabbitmq_url: str) -> pika.ConnectionParameters:
    """Parse an AMQP(S) URL into pika ConnectionParameters."""
    parsed = urlparse(rabbitmq_url)
    credentials = pika.PlainCredentials(
        username=parsed.username or "guest",
        password=parsed.password or "guest",
    )
    ssl_options = None
    if parsed.scheme == "amqps":
        context = ssl.create_default_context()
        ssl_options = pika.SSLOptions(context, parsed.hostname)

    vhost = parsed.path.lstrip("/") or "/"

    return pika.ConnectionParameters(
        host=parsed.hostname or "localhost",
        port=parsed.port or (5671 if parsed.scheme == "amqps" else 5672),
        virtual_host=vhost,
        credentials=credentials,
        ssl_options=ssl_options,
        heartbeat=600,
        blocked_connection_timeout=300,
    )


def publish_ingestion_result(document_id: str, success: bool, chunk_count: int, error_message: str | None = None) -> None:
    """Publish document processing outcome to RabbitMQ reply queue."""
    settings = get_settings()
    try:
        params = _build_connection_params(settings.rabbitmq_url)
        connection = pika.BlockingConnection(params)
        channel = connection.channel()

        payload: dict[str, Any] = {
            "documentId": document_id,
            "success": success,
            "chunkCount": chunk_count,
            "errorMessage": error_message,
        }

        channel.basic_publish(
            exchange=RESULT_EXCHANGE,
            routing_key=RESULT_ROUTING_KEY,
            body=json.dumps(payload).encode("utf-8"),
            properties=pika.BasicProperties(content_type="application/json", delivery_mode=2),
        )
        connection.close()
        logger.info("Published ingestion result for document %s: success=%s", document_id, success)
    except Exception:
        logger.exception("Failed to publish ingestion result for document %s", document_id)
