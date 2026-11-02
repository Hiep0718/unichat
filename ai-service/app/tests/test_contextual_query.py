from app.core.rag.contextual_query import MAX_CONTEXT_CHARS, build_contextual_query


def test_should_build_contextual_query_for_referential_follow_up() -> None:
    history = [
        {"role": "user", "content": "Explain vector embeddings"},
        {"role": "assistant", "content": "They map text into numeric vectors."},
    ]

    query = build_contextual_query("Why does it work?", history, None)

    assert query is not None
    assert "vector embeddings" in query
    assert "Why does it work?" in query


def test_should_not_build_contextual_query_for_standalone_question() -> None:
    query = build_contextual_query("What is a vector embedding?", [], None)

    assert query is None


def test_should_not_build_contextual_query_without_validated_context() -> None:
    query = build_contextual_query("What about that?", [], None)

    assert query is None


def test_should_bound_context_without_rewriting_the_user_question() -> None:
    history = [{"role": "user", "content": "topic " * 200}]
    question = "What about that?"

    query = build_contextual_query(question, history, "summary " * 300)

    assert query is not None
    context = query.split("\nFollow-up question:", maxsplit=1)[0]
    assert len(context) - len("Conversation context:\n") <= MAX_CONTEXT_CHARS
    assert query.endswith(question)
