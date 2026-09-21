package com.unichat.core.communitychat.domain;

/**
 * How far an attachment's AI summary has got.
 *
 * <p>The states are deliberately distinguishable in the UI: a reader waiting on
 * a summary and a reader who will never get one need different words.
 */
public enum SummaryState {

    /** An image: display-only, never retrieved, so never summarised. */
    NOT_APPLICABLE,

    /**
     * Waiting on the document. A member's contribution also waits here for an
     * owner to approve it, since nothing is ingested before that.
     */
    PENDING,

    /** Summarised; {@code aiSummary} holds the text. */
    READY,

    /** Ingestion failed, or the assistant could not summarise the document. */
    UNAVAILABLE
}
