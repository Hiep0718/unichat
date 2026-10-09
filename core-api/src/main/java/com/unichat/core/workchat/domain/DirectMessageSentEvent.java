package com.unichat.core.workchat.domain;

import java.util.Set;
import java.util.UUID;

import com.unichat.core.workchat.api.MessageResponse;

/**
 * Raised when a message has been stored.
 *
 * <p>Lets delivery over WebSocket stay out of the service that saves messages:
 * the service keeps working, and keeps being testable, with no broker present.
 *
 * <p>Names its recipients rather than its conversation, so the broadcaster never
 * has to decide who is entitled to see a message. It is also why delivery uses
 * per-user destinations instead of a topic per conversation: the STOMP
 * interceptor authenticates the connection but does not check subscriptions, so
 * a topic named by conversation id could be subscribed to by anyone logged in.
 *
 * @param recipientIds everyone in the conversation except the sender, whose own
 *                     client already has the message from the request it made
 * @param message      the stored message, as the sender sees it
 */
public record DirectMessageSentEvent(Set<UUID> recipientIds, MessageResponse message) {}
