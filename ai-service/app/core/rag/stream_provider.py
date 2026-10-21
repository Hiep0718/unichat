"""Bounded streaming bridge with provisional claims and a private terminal result."""

import asyncio
import json
import logging
import re
import threading
from collections.abc import AsyncGenerator
from typing import Any

from app.core.rag.answer_pipeline import complete_answer, prepare_answer
from app.core.rag.contracts import RetrievalAnswerRequest
from app.core.rag.provider_contracts import (
    GenerationCancelled,
    check_cancelled,
    operational_failure_code,
)

logger = logging.getLogger(__name__)
_TEXT_VALUE = re.compile(r'"text"\s*:\s*("(?:[^"\\]|\\.)*")')


class StreamDeliveryClosed(GenerationCancelled):
    """Stop an upstream attempt when its private Core subscription has closed."""


def format_sse(event: str, data: dict[str, Any]) -> str:
    """Serialize a complete UTF-8 SSE frame with no synthetic success on EOF."""
    return f"event: {event}\ndata: {json.dumps(data, ensure_ascii=False)}\n\n"


class ProvisionalClaims:
    """Extract completed text fields only; raw JSON is never shown as user prose."""

    def __init__(self) -> None:
        self.buffer = ""
        self.emitted = 0
        self.sequence = 0
        self.attempt_id = ""

    def observe(self, kind: str, payload: dict[str, Any]) -> list[tuple[str, dict[str, Any]]]:
        """Map provider events to temporary text/reset events, independent of final validation."""
        if kind == "attempt":
            self.attempt_id = str(payload["attemptId"])
            return [("pipeline-step", {"stepKey": "GENERATION", "attemptId": self.attempt_id})]
        if kind == "reset":
            self.buffer, self.emitted = "", 0
            return [("reset", {**payload, "attemptId": self.attempt_id})]
        if kind != "raw":
            return []
        self.buffer += str(payload["delta"])
        values = _TEXT_VALUE.findall(self.buffer)
        frames: list[tuple[str, dict[str, Any]]] = []
        for value in values[self.emitted :]:
            self.sequence += 1
            frames.append(
                (
                    "token",
                    {
                        "delta": json.loads(value) + "\n\n",
                        "provisional": True,
                        "attemptId": self.attempt_id,
                        "sequence": self.sequence,
                    },
                )
            )
        self.emitted = len(values)
        return frames


async def generate_rag_answer_stream(request: RetrievalAnswerRequest) -> AsyncGenerator[str]:
    """Run SDK work off-loop and bound buffered events; terminal result is private to Core."""
    loop = asyncio.get_running_loop()
    queue: asyncio.Queue[tuple[str, dict[str, Any]] | None] = asyncio.Queue(maxsize=32)
    closed = threading.Event()
    provisional = ProvisionalClaims()

    def emit(kind: str, payload: dict[str, Any]) -> None:
        if closed.is_set():
            raise StreamDeliveryClosed("SUBSCRIPTION_CLOSED")
        pending = asyncio.run_coroutine_threadsafe(queue.put((kind, payload)), loop)
        try:
            pending.result(timeout=5)
        except TimeoutError as error:
            pending.cancel()
            raise StreamDeliveryClosed("SUBSCRIPTION_BACKPRESSURE") from error

    def observe(kind: str, payload: dict[str, Any]) -> None:
        for event, data in provisional.observe(kind, payload):
            emit(event, data)

    task = asyncio.create_task(asyncio.to_thread(_execute_stream, request, emit, observe, closed))
    try:
        while True:
            item = await _next_frame(queue, task)
            if item is None:
                break
            yield format_sse(item[0], item[1])
            if item[0] in ("result", "error"):
                break
    finally:
        closed.set()
        task.cancel()


async def _next_frame(
    queue: asyncio.Queue[tuple[str, dict[str, Any]] | None], task: asyncio.Task[None]
) -> tuple[str, dict[str, Any]] | None:
    if not queue.empty():
        return queue.get_nowait()
    if task.done():
        return None
    pending = asyncio.create_task(queue.get())
    try:
        done, _ = await asyncio.wait((pending, task), return_when=asyncio.FIRST_COMPLETED)
        return pending.result() if pending in done else None
    finally:
        if not pending.done():
            pending.cancel()


def _execute_stream(
    request: RetrievalAnswerRequest, emit: Any, observe: Any, closed: threading.Event
) -> None:
    try:
        emit(
            "metadata",
            {
                "operationId": str(request.operationId),
                "requestId": request.requestId,
                "knowledgeMode": "EXPANDED" if request.allowExternalKnowledge else "STRICT",
                "provisional": True,
            },
        )
        emit("pipeline-step", {"stepKey": "RETRIEVAL"})
        check_cancelled(closed.is_set)
        prepared = prepare_answer(request, cancelled=closed.is_set)
        check_cancelled(closed.is_set)
        emit("pipeline-step", {"stepKey": "EVIDENCE", "decision": prepared.response.decision})
        result = complete_answer(prepared, observer=observe, cancelled=closed.is_set)
        if result.decision == "REFUSE":
            emit("reset", {"reason": result.refusalCode})
        emit("pipeline-step", {"stepKey": "VALIDATION"})
        emit("result", result.model_dump(mode="json"))
    except GenerationCancelled:
        logger.info("stream_closed request_id=%s", request.requestId)
    except Exception as error:
        logger.error("stream_failed request_id=%s code=%s", request.requestId, type(error).__name__)
        if not closed.is_set():
            code = operational_failure_code(error)
            emit("reset", {"reason": code})
            emit("error", {"code": code, "requestId": request.requestId})
