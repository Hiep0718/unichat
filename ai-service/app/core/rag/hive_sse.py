"""Incremental bounded UTF-8 SSE framing and strict Hive completion decoding."""

import codecs
import json
import re
from typing import Any

from app.core.rag.provider_contracts import MAX_OUTPUT_CHARACTERS, ProviderFailure

MAX_EVENT_BYTES = 256 * 1024
_LINE_END = re.compile(r"\r\n|\r|\n")


class SseParser:
    """Decode arbitrary raw transport fragments without fixed-size HTTPX buffering."""

    def __init__(self) -> None:
        self._decoder = codecs.getincrementaldecoder("utf-8")("strict")
        self._buffer = ""
        self._data: list[str] = []
        self._event_bytes = 0

    def feed(self, chunk: bytes, final: bool = False) -> list[str]:
        """Return complete SSE data events; incomplete terminal events never imply success."""
        try:
            self._buffer += self._decoder.decode(chunk, final=final)
        except UnicodeError as error:
            raise ProviderFailure("PROVIDER_PROTOCOL_ERROR") from error
        events: list[str] = []
        while match := _LINE_END.search(self._buffer):
            if match.group() == "\r" and match.end() == len(self._buffer) and not final:
                break
            line, self._buffer = self._buffer[: match.start()], self._buffer[match.end() :]
            event = self._line(line)
            if event is not None:
                events.append(event)
        if len(self._buffer.encode("utf-8")) > MAX_EVENT_BYTES:
            raise ProviderFailure("OUTPUT_LIMIT_EXCEEDED")
        return events

    def _line(self, line: str) -> str | None:
        self._event_bytes += len(line.encode("utf-8")) + 1
        if self._event_bytes > MAX_EVENT_BYTES:
            raise ProviderFailure("OUTPUT_LIMIT_EXCEEDED")
        if not line:
            event = "\n".join(self._data) if self._data else None
            self._data, self._event_bytes = [], 0
            return event
        if line.startswith(":"):
            return None
        field, separator, value = line.partition(":")
        if field == "data":
            self._data.append(value.removeprefix(" ") if separator else "")
        return None


def _usage_count(value: object) -> int | None:
    if value is None:
        return None
    if type(value) is not int or value < 0:
        raise ProviderFailure("PROVIDER_PROTOCOL_ERROR")
    return value


class HiveCompletion:
    """Accumulate content only; reasoning is discarded and never counted twice."""

    def __init__(self, expected_model: str | None = None) -> None:
        self.expected_model = expected_model
        self.parts: list[str] = []
        self.characters = 0
        self.done = False
        self.finished = False
        self.input_tokens: int | None = None
        self.output_tokens: int | None = None

    def accept(self, event: str) -> str:
        """Validate one provider event, returning only a visible content delta."""
        if self.done:
            raise ProviderFailure("PROVIDER_PROTOCOL_ERROR")
        if event == "[DONE]":
            self.done = True
            return ""
        try:
            data: object = json.loads(event)
        except ValueError as error:
            raise ProviderFailure("PROVIDER_PROTOCOL_ERROR") from error
        if not isinstance(data, dict) or "error" in data or data.get("refusal"):
            raise ProviderFailure("PROVIDER_PROTOCOL_ERROR")
        if (self.expected_model is not None and data.get("model") is not None
                and data["model"] != self.expected_model):
            raise ProviderFailure("PROVIDER_PROTOCOL_ERROR")
        self._usage(data)
        choices = data.get("choices", [])
        if not isinstance(choices, list) or len(choices) > 1:
            raise ProviderFailure("PROVIDER_PROTOCOL_ERROR")
        return self._choice(choices[0]) if choices else ""

    def _usage(self, data: dict[str, Any]) -> None:
        usage = data.get("usage")
        if usage is None:
            return
        if not isinstance(usage, dict):
            raise ProviderFailure("PROVIDER_PROTOCOL_ERROR")
        self.input_tokens = _usage_count(usage.get("prompt_tokens"))
        self.output_tokens = _usage_count(usage.get("completion_tokens"))

    def _choice(self, choice: object) -> str:
        if not isinstance(choice, dict):
            raise ProviderFailure("PROVIDER_PROTOCOL_ERROR")
        finish = choice.get("finish_reason")
        if finish == "content_filter":
            raise ProviderFailure("PROVIDER_REFUSAL")
        if finish is not None and finish != "stop":
            raise ProviderFailure("PROVIDER_TRUNCATED_RESPONSE")
        delta = choice.get("delta", {})
        if (not isinstance(delta, dict) or delta.get("tool_calls") is not None
                or delta.get("function_call") is not None):
            raise ProviderFailure("PROVIDER_PROTOCOL_ERROR")
        if delta.get("refusal") or choice.get("refusal"):
            raise ProviderFailure("PROVIDER_REFUSAL")
        content = delta.get("content")
        content = "" if content is None else content
        if not isinstance(content, str) or (self.finished and content):
            raise ProviderFailure("PROVIDER_PROTOCOL_ERROR")
        self.finished = self.finished or finish == "stop"
        self.characters += len(content)
        if self.characters > MAX_OUTPUT_CHARACTERS:
            raise ProviderFailure("OUTPUT_LIMIT_EXCEEDED")
        self.parts.append(content)
        return content

    def text(self) -> str:
        """Require the explicit terminal marker and nonempty content before success."""
        if not self.done:
            raise ProviderFailure("PROVIDER_TRUNCATED_RESPONSE")
        text = "".join(self.parts)
        if not text.strip():
            raise ProviderFailure("PROVIDER_EMPTY_RESPONSE")
        return text
