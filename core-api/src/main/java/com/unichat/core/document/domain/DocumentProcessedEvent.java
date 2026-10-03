package com.unichat.core.document.domain;

import java.util.UUID;

/**
 * Raised when a document finishes ingestion and becomes retrievable.
 *
 * <p>Published only on success: a failed ingestion leaves nothing to read, and
 * listeners that summarise or index the document would have no content to work
 * from.
 *
 * @param documentId  the document now in the library
 * @param workspaceId group whose library it entered
 */
public record DocumentProcessedEvent(UUID documentId, UUID workspaceId) {}
