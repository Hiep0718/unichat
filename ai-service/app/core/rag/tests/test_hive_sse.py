"""Adversarial offline tests for raw Hive event framing and completion validation."""

import json

import pytest

from app.core.rag.hive_sse import MAX_EVENT_BYTES, HiveCompletion, SseParser
from app.core.rag.provider_contracts import ProviderFailure


def event(content: object = "Đầy đủ", **overrides: object) -> str:
    """Build a provider event without invoking a transport."""
    return json.dumps({"choices": [{"delta": {"content": content}, **overrides}]},
                      ensure_ascii=False)


@pytest.mark.parametrize("separator", ["\n", "\r\n", "\r"])
@pytest.mark.parametrize("fragment_size", [1, 2, 7, 4096])
def test_should_decode_unicode_comments_and_fragmented_line_endings(
    separator: str, fragment_size: int,
) -> None:
    wire = (f": heartbeat{separator}data: Tiếng{separator}data: Việt{separator}{separator}"
            f"data: [DONE]{separator}{separator}").encode()
    parser = SseParser()
    events = []
    for offset in range(0, len(wire), fragment_size):
        events.extend(parser.feed(wire[offset:offset + fragment_size]))
    events.extend(parser.feed(b"", final=True))
    assert events == ["Tiếng\nViệt", "[DONE]"]


def test_should_never_dispatch_unterminated_event_or_accept_invalid_utf8() -> None:
    parser = SseParser()
    assert parser.feed(b"data: [DONE]") == []
    assert parser.feed(b"", final=True) == []
    with pytest.raises(ProviderFailure, match="PROVIDER_PROTOCOL_ERROR"):
        SseParser().feed(b"\xff")
    parser = SseParser()
    parser.feed(b"\xc3")
    with pytest.raises(ProviderFailure):
        parser.feed(b"", final=True)


@pytest.mark.parametrize("wire", [b"data: " + b"x" * MAX_EVENT_BYTES,
                                  b":" + b"x" * MAX_EVENT_BYTES + b"\n",
                                  (b"data: x\n" * (MAX_EVENT_BYTES // 8 + 1))],
                         ids=["line-limit", "comment-limit", "event-limit"])
def test_should_bound_incomplete_lines_and_events(wire: bytes) -> None:
    with pytest.raises(ProviderFailure, match="OUTPUT_LIMIT_EXCEEDED"):
        SseParser().feed(wire)


def test_should_discard_reasoning_and_preserve_only_measured_usage() -> None:
    completion = HiveCompletion()
    assert completion.accept(json.dumps({"choices": [{"delta": {"reasoning_content": "secret"}}]})) == ""
    assert completion.accept(event()) == "Đầy đủ"
    completion.accept(json.dumps({"choices": [], "usage": {"prompt_tokens": 10,
        "completion_tokens": 4, "completion_tokens_details": {"reasoning_tokens": 3}}}))
    completion.accept(event(None, finish_reason="stop"))
    completion.accept("[DONE]")
    assert completion.text() == "Đầy đủ"
    assert completion.input_tokens == 10
    assert completion.output_tokens == 4
    assert "secret" not in completion.text()


@pytest.mark.parametrize("payload", ["bad json", "[]", '{"error":{"secret":"raw"}}',
    '{"refusal":"blocked"}', '{"choices":{}}', '{"choices":[{},{}]}',
    '{"choices":[false]}', '{"choices":[{"delta":false}]}',
    '{"choices":[{"delta":{"tool_calls":[]}}]}',
    '{"choices":[{"delta":{"function_call":{}}}]}',
    '{"choices":[{"delta":{"refusal":"blocked"}}]}',
    '{"choices":[{"refusal":"blocked"}]}', event(False), event(12),
    event("text", finish_reason="length"), event("text", finish_reason="tool_calls"),
    '{"usage":false}', '{"usage":{"prompt_tokens":true}}',
    '{"usage":{"completion_tokens":-1}}', '{"usage":{"completion_tokens":1.5}}'])
def test_should_reject_unsupported_or_malformed_provider_events(payload: str) -> None:
    with pytest.raises(ProviderFailure):
        HiveCompletion().accept(payload)


def test_should_reject_eof_empty_and_content_after_stop() -> None:
    completion = HiveCompletion()
    completion.accept(event("text"))
    with pytest.raises(ProviderFailure, match="TRUNCATED"):
        completion.text()
    completion.accept(event(None, finish_reason="stop"))
    with pytest.raises(ProviderFailure, match="PROTOCOL"):
        completion.accept(event("late"))
    completion.accept("[DONE]")
    assert completion.text() == "text"
    with pytest.raises(ProviderFailure):
        completion.accept("[DONE]")
    empty = HiveCompletion()
    empty.accept("[DONE]")
    with pytest.raises(ProviderFailure, match="EMPTY"):
        empty.text()


def test_should_cap_answer_and_keep_unknown_usage_null() -> None:
    completion = HiveCompletion()
    completion.accept(event("x" * 80000))
    assert completion.input_tokens is None and completion.output_tokens is None
    with pytest.raises(ProviderFailure, match="OUTPUT_LIMIT"):
        completion.accept(event("x"))
