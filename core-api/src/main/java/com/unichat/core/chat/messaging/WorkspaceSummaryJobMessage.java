package com.unichat.core.chat.messaging;

import java.util.UUID;

/** Content-free RabbitMQ pointer for a Core-owned workspace summary operation. */
public record WorkspaceSummaryJobMessage(UUID operationId, String requestId,
        String taskType, String sourceFingerprint, String configHash) { }
