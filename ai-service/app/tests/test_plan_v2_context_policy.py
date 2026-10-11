"""Source-safe memory and summary filtering without provider or Core traffic."""

from typing import Any
from unittest.mock import patch

import pytest

from app.core.rag.context_policy import dependencies_current, safe_context
from app.core.rag.contracts import HistoryMessage, SourceDependency
from app.core.rag.conversation_memory import (
    ConversationContext,
    ConversationMessage,
    build_conversation_prompt,
    compact_conversation,
)
from app.core.rag.generation_policy import GenerationPolicyError
from app.core.rag.provider_gateway import ProviderResult
from app.tests.plan_v2_fixtures import DOCUMENT_HASH, DOCUMENT_ID, policy, source


def dependency(**changes: Any) -> SourceDependency:
    return SourceDependency.model_validate({"documentId": DOCUMENT_ID, "ingestionVersion": 2,
                                            "contentHash": DOCUMENT_HASH, **changes})


@pytest.mark.parametrize("dependencies,current", [
    ([], False), ([dependency()], True),
    ([dependency(ingestionVersion=1)], False),
    ([dependency(contentHash="a" * 64)], False),
])
def test_should_accept_only_exact_current_dependencies(dependencies: list[SourceDependency], current: bool) -> None:
    assert dependencies_current(dependencies, [source()]) is current


def test_should_drop_legacy_changed_and_revoked_assistant_context() -> None:
    history = [HistoryMessage(role="user", content="Follow up"),
               HistoryMessage(role="assistant", content="Legacy leaked content"),
               HistoryMessage(role="assistant", content="Changed source answer",
                              sources=[dependency(ingestionVersion=1)]),
               HistoryMessage(role="assistant", content="Allowed answer", sources=[dependency()])]
    messages, summary, dependencies = safe_context(history, "Invalid summary", [], [source()])
    assert [message["content"] for message in messages] == ["Follow up", "Allowed answer"]
    assert summary is None
    assert dependencies == [dependency()]
    revoked, summary, dependencies = safe_context(history, "Old summary", [dependency()], [])
    assert revoked == [{"role": "user", "content": "Follow up"}]
    assert summary is None and dependencies == []


def test_should_keep_verified_summary_dependencies_and_limit_ten_turns() -> None:
    history = [HistoryMessage(role="user", content=f"Question {index}") for index in range(30)]
    messages, summary, dependencies = safe_context(history, "Valid summary", [dependency()],
                                                  [source()])
    assert len(messages) == 20
    assert messages[0]["content"] == "Question 10"
    assert summary == "Valid summary"
    assert dependencies == [dependency()]


def test_should_use_shared_policy_provider_for_compaction() -> None:
    messages = [ConversationMessage(role="user", content="Verified user question")]
    result = ProviderResult("Tóm tắt đã kiểm quyền", "gemini", "test-model", "primary")
    with patch("app.core.rag.conversation_memory.generate", return_value=result) as generator:
        summary = compact_conversation(messages, "Previous verified summary", policy())
    assert summary == "Tóm tắt đã kiểm quyền"
    assert generator.call_args.kwargs["purpose"] == "COMPACTION"
    assert "Verified user question" in generator.call_args.args[0]


@pytest.mark.parametrize("text", ["", " " * 10, "x" * 5001])
def test_should_reject_invalid_compaction_output(text: str) -> None:
    with patch("app.core.rag.conversation_memory.generate",
               return_value=ProviderResult(text, "gemini", "test", "primary")):
        with pytest.raises(ValueError):
            compact_conversation([ConversationMessage(role="user", content="Question")],
                                 policy=policy())


def test_should_keep_existing_summary_without_call_when_no_messages() -> None:
    with patch("app.core.rag.conversation_memory.generate") as generator:
        assert compact_conversation([], "Existing verified summary", policy()) == "Existing verified summary"
    generator.assert_not_called()


def test_should_never_compact_without_policy() -> None:
    with patch("app.core.rag.conversation_memory.generate") as generator:
        with pytest.raises(GenerationPolicyError):
            compact_conversation([ConversationMessage(role="user", content="Question")])
    generator.assert_not_called()


def test_should_keep_bounded_prompt_and_newest_messages() -> None:
    context = ConversationContext(recent_messages=[
        ConversationMessage(role="user", content=f"Question {index}") for index in range(30)
    ])
    prompt = build_conversation_prompt(context, max_tokens=150)
    assert len(prompt) <= 300
    assert "Question 29" in prompt
    assert "Question 0\n" not in prompt
