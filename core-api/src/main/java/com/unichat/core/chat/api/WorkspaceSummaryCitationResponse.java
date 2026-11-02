package com.unichat.core.chat.api;

import java.util.UUID;

/** Authorized source location for one cited workspace summary chunk. */
public record WorkspaceSummaryCitationResponse(UUID documentId, String fileName, String chunkId,
        String locator, String excerpt, String contentHash, int ingestionVersion) { }
