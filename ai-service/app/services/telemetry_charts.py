"""Measured partial diagnostic aggregates; unknown usage remains null."""

from datetime import UTC, datetime, timedelta
from typing import Any


def event_timestamp(record: dict[str, Any]) -> datetime:
    try:
        timestamp = datetime.fromisoformat(str(record.get("occurredAt") or record.get("timestamp")))
        return timestamp.replace(tzinfo=UTC) if timestamp.tzinfo is None else timestamp
    except ValueError:
        return datetime.min.replace(tzinfo=UTC)


def diagnostic_charts(
    records: list[dict[str, Any]], days: int, now: datetime, models: list[str]
) -> dict[str, Any]:
    labels = [(now - timedelta(days=index)).date() for index in reversed(range(days))]
    rows = [
        _day_metrics(
            [record for record in records if event_timestamp(record).date() == day],
            day.isoformat(),
            models,
        )
        for day in labels
    ]
    return {
        "chartRequestsSuccess": [row["requests"] for row in rows],
        "chartErrors": [row["errors"] for row in rows],
        "chartInputTokens": [row["input"] for row in rows],
        "chartOutputTokens": [row["output"] for row in rows],
        "chartRequestsPerModel": [row["models"] for row in rows],
    }


def _day_metrics(records: list[dict[str, Any]], label: str, models: list[str]) -> dict[str, Any]:
    successes = sum(record.get("outcome") == "SUCCESS" for record in records)
    errors = [
        str(record.get("errorCode", "")) for record in records if record.get("outcome") == "ERROR"
    ]
    return {
        "requests": {
            "date": label,
            "requests": len(records),
            "successRate": successes * 100 / len(records) if records else None,
        },
        "errors": {
            "date": label,
            "error429": errors.count("PROVIDER_HTTP_429"),
            "error503": errors.count("PROVIDER_HTTP_503"),
            "totalErrors": len(errors),
            "errorOther": sum(
                code not in ("PROVIDER_HTTP_429", "PROVIDER_HTTP_503") for code in errors
            ),
        },
        "input": {
            "date": label,
            **{model: _sum_usage(records, model, "inputTokens") for model in models},
        },
        "output": {
            "date": label,
            **{model: _sum_usage(records, model, "outputTokens") for model in models},
        },
        "models": {
            "date": label,
            **{model: sum(record.get("model") == model for record in records) for model in models},
        },
    }


def _sum_usage(records: list[dict[str, Any]], model: str, field: str) -> int | None:
    samples = [record.get(field) for record in records if record.get("model") == model]
    if not samples or not all(type(value) is int for value in samples):
        return None
    return sum(value for value in samples if isinstance(value, int))


