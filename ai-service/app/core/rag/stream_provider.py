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
class StreamDeliveryClosed(GenerationCancelled):
    """Stop an upstream attempt when its private Core subscription has closed."""


def format_sse(event: str, data: dict[str, Any]) -> str:
    """Serialize a complete UTF-8 SSE frame with no synthetic success on EOF."""
    return f"event: {event}\ndata: {json.dumps(data, ensure_ascii=False)}\n\n"


class IncrementalClaimExtractor:
    """Extract and unescape text fields incrementally.

    Emits ordinary prose character-by-character/token-by-token for smooth streaming,
    while buffering Mermaid code fences to emit diagrams as single complete blocks.
    """

    def __init__(self) -> None:
        self.state = "SEEKING"
        self.raw_buf = ""
        self.escape_buf = ""
        self.mermaid_buf = ""
        self.in_mermaid = False

    def reset(self) -> None:
        self.state = "SEEKING"
        self.raw_buf = ""
        self.escape_buf = ""
        self.mermaid_buf = ""
        self.in_mermaid = False

    def feed(self, delta: str) -> list[str]:
        out: list[str] = []
        self.raw_buf += delta
        while self.raw_buf:
            if self.state == "SEEKING":
                m = re.search(r'"text"\s*:\s*"', self.raw_buf)
                if not m:
                    if len(self.raw_buf) > 30:
                        self.raw_buf = self.raw_buf[-20:]
                    break
                self.raw_buf = self.raw_buf[m.end():]
                self.state = "IN_TEXT"
                self.escape_buf = ""
                self.mermaid_buf = ""
                self.in_mermaid = False

            if self.state == "IN_TEXT":
                idx = 0
                text_chars: list[str] = []
                while idx < len(self.raw_buf):
                    ch = self.raw_buf[idx]
                    if self.escape_buf:
                        self.escape_buf += ch
                        idx += 1
                        unescaped = self._unescape_char()
                        if unescaped is not None:
                            text_chars.append(unescaped)
                        continue
                    if ch == "\\":
                        self.escape_buf = "\\"
                        idx += 1
                        continue
                    if ch == '"':
                        self.raw_buf = self.raw_buf[idx + 1:]
                        self.state = "SEEKING"
                        if text_chars:
                            self._process_piece("".join(text_chars) + "\n\n", out)
                            text_chars = []
                        elif self.mermaid_buf:
                            out.append(self.mermaid_buf + "\n\n")
                            self.mermaid_buf = ""
                            self.in_mermaid = False
                        else:
                            out.append("\n\n")
                        break
                    text_chars.append(ch)
                    idx += 1

                if self.state == "IN_TEXT":
                    self.raw_buf = ""
                    if text_chars:
                        self._process_piece("".join(text_chars), out)
                    break
        return out

    def _unescape_char(self) -> str | None:
        seq = self.escape_buf
        mapping = {
            "\\\\": "\\", '\\"': '"', "\\n": "\n", "\\r": "\r",
            "\\t": "\t", "\\/": "/", "\\b": "\b", "\\f": "\f",
        }
        if seq in mapping:
            self.escape_buf = ""
            return mapping[seq]
        if seq.startswith("\\u"):
            if len(seq) == 6:
                self.escape_buf = ""
                try:
                    return chr(int(seq[2:], 16))
                except ValueError:
                    return seq
            return None
        if len(seq) >= 2 and not seq.startswith("\\u"):
            self.escape_buf = ""
            return seq[1:]
        return None

    def _process_piece(self, piece: str, out: list[str]) -> None:
        if not piece:
            return
        full = (self.mermaid_buf if self.in_mermaid else "") + piece
        if not self.in_mermaid:
            m_start = full.find("```mermaid")
            if m_start == -1:
                out.append(piece)
            else:
                before = full[:m_start]
                if before:
                    out.append(before)
                self.in_mermaid = True
                self.mermaid_buf = full[m_start:]
                self._check_mermaid_close(out)
        else:
            self.mermaid_buf += piece
            self._check_mermaid_close(out)

    def _check_mermaid_close(self, out: list[str]) -> None:
        start_tag = "```mermaid"
        pos = self.mermaid_buf.find(start_tag)
        if pos == -1:
            return
        after_tag = pos + len(start_tag)
        end_tag = self.mermaid_buf.find("```", after_tag)
        if end_tag != -1:
            close_pos = end_tag + 3
            if close_pos < len(self.mermaid_buf) and self.mermaid_buf[close_pos] == "\n":
                close_pos += 1
            out.append(self.mermaid_buf[:close_pos])
            remainder = self.mermaid_buf[close_pos:]
            self.in_mermaid = False
            self.mermaid_buf = ""
            if remainder:
                self._process_piece(remainder, out)


class ProvisionalClaims:
    """Extract claim text incrementally; buffers Mermaid diagrams to emit as single blocks."""

    def __init__(self) -> None:
        self.extractor = IncrementalClaimExtractor()
        self.sequence = 0
        self.attempt_id = ""

    def observe(self, kind: str, payload: dict[str, Any]) -> list[tuple[str, dict[str, Any]]]:
        """Map provider events to temporary text/reset events, independent of final validation."""
        if kind == "attempt":
            self.attempt_id = str(payload["attemptId"])
            return [("pipeline-step", {"stepKey": "GENERATION", "attemptId": self.attempt_id})]
        if kind == "reset":
            self.extractor.reset()
            return [("reset", {**payload, "attemptId": self.attempt_id})]
        if kind != "raw":
            return []
        deltas = self.extractor.feed(str(payload["delta"]))
        frames: list[tuple[str, dict[str, Any]]] = []
        for delta in deltas:
            self.sequence += 1
            frames.append(
                (
                    "token",
                    {
                        "delta": delta,
                        "provisional": True,
                        "attemptId": self.attempt_id,
                        "sequence": self.sequence,
                    },
                )
            )
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
