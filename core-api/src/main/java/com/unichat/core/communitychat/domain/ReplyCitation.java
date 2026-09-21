package com.unichat.core.communitychat.domain;

/**
 * A source the assistant cited when answering in a thread.
 *
 * <p>Stored with the reply so a reader can check the claim later, even if the
 * retrieval trace has since been pruned.
 *
 * @param citationId index the answer text refers to, e.g. "1" for {@code [1]}
 * @param documentId document in the group's library
 * @param fileName   name shown to the reader
 * @param locator    page or block within the document
 * @param excerpt    the passage the answer drew on
 */
public record ReplyCitation(
        String citationId,
        String documentId,
        String fileName,
        String locator,
        String excerpt
) {}
