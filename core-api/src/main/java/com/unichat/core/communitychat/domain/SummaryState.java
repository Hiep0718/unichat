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
     * No summary yet. A member asks for one from the post; until the document
     * is processed (or, for a member's contribution, approved by an owner) the
     * request is refused with a reason. Also the state while one is produced.
     */
    PENDING,

    /** Summarised; {@code aiSummary} holds the text. */
    READY,

    /** The last attempt produced no summary; a member may ask again. */
    UNAVAILABLE
}
