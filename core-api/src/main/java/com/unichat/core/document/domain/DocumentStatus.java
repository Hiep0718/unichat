package com.unichat.core.document.domain;

/**
 * Status of document processing lifecycle.
 */
public enum DocumentStatus {
    PENDING,
    PROCESSING,
    PROCESSED,
    FAILED,
    DELETING,
    PENDING_REVIEW,
    PLATFORM_REJECTED,
    OWNER_REJECTED
}
