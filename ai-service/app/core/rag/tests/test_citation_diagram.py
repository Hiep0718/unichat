"""Citation rendering must preserve Markdown diagram fences."""

from app.core.rag.citation_validator import _render_claim


def test_should_place_citation_after_a_closed_mermaid_fence() -> None:
    diagram = "```mermaid\nflowchart LR\n A --> B\n```"

    rendered = _render_claim(diagram, ["1"])

    assert rendered == diagram + "\n\n[1]"


def test_should_keep_citations_inline_for_prose() -> None:
    assert _render_claim("Một nhận định", ["1"]) == "Một nhận định [1]"
