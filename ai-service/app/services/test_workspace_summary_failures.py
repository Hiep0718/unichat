"""Broker failure handling uses durable retries without real network calls."""

import json
from types import SimpleNamespace
from unittest.mock import MagicMock

from pika.spec import BasicProperties

from app.core.service_security import ServiceSecurityError
from app.services import workspace_summary_failures as failures


def message() -> bytes:
    return json.dumps({"operationId": "operation", "requestId": "request"}).encode()


def test_should_ack_duplicate_worker_without_retry(monkeypatch) -> None:
    core = MagicMock()
    monkeypatch.setattr(failures, "call_core", core)
    channel = MagicMock()

    failures.handle_failure(
        channel,
        SimpleNamespace(delivery_tag=1),
        BasicProperties(headers={}),
        message(),
        ServiceSecurityError("SUMMARY_WORKER_ALREADY_CLAIMED"),
    )

    channel.basic_ack.assert_called_once_with(delivery_tag=1)
    channel.basic_publish.assert_not_called()
    core.assert_not_called()


def test_should_publish_delayed_retry_after_core_lease_update(monkeypatch) -> None:
    core = MagicMock()
    monkeypatch.setattr(failures, "call_core", core)
    channel = MagicMock()

    failures.handle_failure(
        channel,
        SimpleNamespace(delivery_tag=2),
        BasicProperties(headers={}),
        message(),
        RuntimeError("temporary"),
    )

    core.assert_called_once()
    assert channel.basic_publish.call_args.kwargs["routing_key"] == failures.RETRY_QUEUES[0][1]
    channel.basic_ack.assert_called_once_with(delivery_tag=2)


def test_should_report_incomplete_source_without_retry(monkeypatch) -> None:
    core = MagicMock()
    monkeypatch.setattr(failures, "call_core", core)
    channel = MagicMock()

    failures.handle_failure(
        channel,
        SimpleNamespace(delivery_tag=3),
        BasicProperties(headers={}),
        message(),
        ValueError("SUMMARY_INCOMPLETE"),
    )

    assert core.call_args.args[0].endswith("/fail")
    assert channel.basic_publish.call_args.kwargs["routing_key"] == failures.SUMMARY_DLQ
    channel.basic_ack.assert_called_once_with(delivery_tag=3)


def test_should_requeue_when_retry_publish_fails(monkeypatch) -> None:
    monkeypatch.setattr(failures, "call_core", MagicMock())
    channel = MagicMock()
    channel.basic_publish.side_effect = RuntimeError("broker unavailable")

    failures.handle_failure(
        channel,
        SimpleNamespace(delivery_tag=4),
        BasicProperties(headers={}),
        message(),
        RuntimeError("temporary"),
    )

    channel.basic_nack.assert_called_once_with(delivery_tag=4, requeue=True)
    channel.basic_ack.assert_not_called()
