package com.unichat.core.document.domain;

/**
 * Status of document processing lifecycle.
 *
 * <p>Contributions from members without upload rights start at
 * {@link #PENDING_APPROVAL} and are never sent to ingestion until an owner or
 * editor approves them, at which point they continue through the normal
 * {@link #PENDING} to {@link #PROCESSED} flow.
 */
public enum DocumentStatus {
    /** Contributed by a member; awaiting owner/editor approval. Not ingested. */
    PENDING_APPROVAL,
    /** Contribution declined by an owner/editor. Not ingested. */
    REJECTED,
    PENDING,
    PROCESSING,
    PROCESSED,
    FAILED,
    DELETING
}
