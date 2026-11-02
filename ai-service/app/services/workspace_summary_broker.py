"""Connection settings for durable workspace summary delivery."""

import ssl
from urllib.parse import urlparse

import pika  # type: ignore[import-untyped]


def connection_parameters(url: str) -> pika.ConnectionParameters:
    """Build a private RabbitMQ connection with TLS when configured."""
    parsed = urlparse(url)
    credentials = pika.PlainCredentials(parsed.username or "guest", parsed.password or "guest")
    ssl_options = None
    if parsed.scheme == "amqps":
        ssl_options = pika.SSLOptions(ssl.create_default_context(), parsed.hostname)
    return pika.ConnectionParameters(
        host=parsed.hostname or "localhost",
        port=parsed.port or 5672,
        virtual_host=parsed.path.lstrip("/") or "/",
        credentials=credentials,
        ssl_options=ssl_options,
        heartbeat=600,
        blocked_connection_timeout=300,
    )
