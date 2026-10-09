package com.unichat.core.workchat.domain;

import java.util.Set;
import java.util.UUID;

/**
 * Raised when someone's list of conversations has changed without a message
 * being sent — they were added to a group, removed from one, or it was renamed.
 *
 * <p>Without this, being added to a group shows nothing until the page is
 * reloaded, because the list is only refreshed when a message arrives.
 *
 * <p>Carries no detail beyond the conversation. The client refetches its list
 * rather than being told what changed: the list is one cheap request, and a
 * patch would be a second description of the same state to keep correct.
 *
 * @param recipientIds everyone whose list is now out of date
 * @param conversationId what changed, for logging and for the client to focus
 */
public record ConversationListChangedEvent(Set<UUID> recipientIds, UUID conversationId) {}
