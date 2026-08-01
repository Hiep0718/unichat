"""RabbitMQ consumer for document ingestion messages.

Connects to a RabbitMQ broker (local or CloudAMQP) and listens
on the ``unichat.ingestion.queue`` for ingestion tasks published
by Core API.
"""

import json
import logging
import ssl
import threading
from typing import Any
from urllib.parse import urlparse

import pika
from pika.adapters.blocking_connection import BlockingChannel
from pika.spec import Basic, BasicProperties

from app.services.ingestion_consumer import process_ingestion_message

logger = logging.getLogger(__name__)

INGESTION_QUEUE = "unichat.ingestion.queue"


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


def _on_message(
    channel: BlockingChannel,
    method: Basic.Deliver,
    _properties: BasicProperties,
    body: bytes,
) -> None:
    """Process a single ingestion message from the queue."""
    try:
        payload: dict[str, Any] = json.loads(body)
        logger.info(
            "Received RabbitMQ ingestion message: documentId=%s",
            payload.get("documentId"),
        )
        success = process_ingestion_message(payload)
        if success:
            channel.basic_ack(delivery_tag=method.delivery_tag)
        else:
            channel.basic_nack(delivery_tag=method.delivery_tag, requeue=False)
    except Exception:
        logger.exception("Unexpected error processing RabbitMQ message")
        channel.basic_nack(delivery_tag=method.delivery_tag, requeue=False)


def start_consumer(rabbitmq_url: str) -> None:
    """Connect to RabbitMQ and start consuming ingestion messages.

    This function blocks forever and is intended to run in a daemon thread.
    """
    logger.info("Connecting RabbitMQ consumer to: %s", _redact_url(rabbitmq_url))
    params = _build_connection_params(rabbitmq_url)
    connection = pika.BlockingConnection(params)
    channel = connection.channel()

    # Ensure queue exists (idempotent declaration matching Core API config)
    channel.queue_declare(queue=INGESTION_QUEUE, durable=True)
    channel.basic_qos(prefetch_count=1)
    channel.basic_consume(queue=INGESTION_QUEUE, on_message_callback=_on_message)

    logger.info("RabbitMQ consumer started, waiting for messages on '%s'", INGESTION_QUEUE)
    channel.start_consuming()


def start_consumer_thread(rabbitmq_url: str) -> threading.Thread:
    """Launch the RabbitMQ consumer in a background daemon thread."""
    thread = threading.Thread(
        target=_start_consumer_safe,
        args=(rabbitmq_url,),
        name="rabbitmq-consumer",
        daemon=True,
    )
    thread.start()
    return thread


def _start_consumer_safe(rabbitmq_url: str) -> None:
    """Wrapper that logs connection errors without crashing the app."""
    try:
        start_consumer(rabbitmq_url)
    except Exception:
        logger.exception(
            "RabbitMQ consumer failed to start. Ingestion via queue is disabled."
        )


def _redact_url(url: str) -> str:
    """Redact password from AMQP URL for safe logging."""
    parsed = urlparse(url)
    if parsed.password:
        return url.replace(parsed.password, "***")
    return url
