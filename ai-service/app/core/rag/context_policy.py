"""Filter legacy or changed-source context using only the supplied Core snapshot."""

from app.core.rag.contracts import HistoryMessage, SourceDependency, SourceVersion


def dependencies_current(
    dependencies: list[SourceDependency], sources: list[SourceVersion]
) -> bool:
    """A nonempty dependency set must match every currently authorized source version."""
    snapshot = {
        str(source.documentId): (source.ingestionVersion, source.contentHash) for source in sources
    }
    return bool(dependencies) and all(
        snapshot.get(str(dependency.documentId))
        == (dependency.ingestionVersion, dependency.contentHash)
        for dependency in dependencies
    )


def safe_context(
    history: list[HistoryMessage],
    summary: str | None,
    summary_sources: list[SourceDependency],
    sources: list[SourceVersion],
) -> tuple[list[dict[str, str]], str | None, list[SourceDependency]]:
    """Drop unverifiable assistant turns and summaries; never reconstruct their sources."""
    messages: list[dict[str, str]] = []
    used: dict[str, SourceDependency] = {}
    for message in history[-20:]:
        if message.role.lower() == "assistant" and not dependencies_current(
            message.sources, sources
        ):
            continue
        messages.append({"role": message.role.lower(), "content": message.content})
        for source in message.sources:
            if dependencies_current([source], sources):
                used[str(source.documentId)] = source
    valid_summary = summary if dependencies_current(summary_sources, sources) else None
    if valid_summary:
        used.update({str(source.documentId): source for source in summary_sources})
    return messages, valid_summary, list(used.values())
