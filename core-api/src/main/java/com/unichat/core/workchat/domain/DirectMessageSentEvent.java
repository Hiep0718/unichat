package com.unichat.core.workchat.domain;

import java.util.UUID;

import com.unichat.core.workchat.api.MessageResponse;

/**
 * Raised when a message has been stored.
 *
 * <p>Lets delivery over WebSocket stay out of the service that saves messages:
 * the service keeps working, and keeps being testable, with no broker present.
 *
 * @param recipientId the participant who did not send it
 * @param message     the stored message, as the sender sees it
 */
public record DirectMessageSentEvent(UUID recipientId, MessageResponse message) {}
