package com.unichat.core.workchat.domain;

import java.time.Instant;
import java.util.UUID;

import jakarta.persistence.Column;
import jakarta.persistence.EmbeddedId;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Table;

/**
 * Someone taking part in a conversation.
 *
 * <p>Present for both kinds: a one-to-one conversation also has two of these,
 * so that participation, read state and listing are answered the same way
 * whether there are two people or twenty.
 *
 * <p>Read state is a watermark rather than a flag on each message. With several
 * people in a conversation, "read" is a fact about a person and not about a
 * message, and a flag per message per person would be a row for every pairing.
 */
@Entity
@Table(name = "conversation_participants")
public class ConversationParticipant {

    @EmbeddedId
    private ConversationParticipantId id;

    @Enumerated(EnumType.STRING)
    @Column(name = "role", nullable = false)
    private ParticipantRole role;

    @Column(name = "joined_at", nullable = false, updatable = false)
    private Instant joinedAt;

    /** Everything up to here has been seen; null while nothing has. */
    @Column(name = "last_read_at")
    private Instant lastReadAt;

    protected ConversationParticipant() {}

    public ConversationParticipant(UUID conversationId, UUID userId, ParticipantRole role,
                                   Instant joinedAt) {
        this.id = new ConversationParticipantId(conversationId, userId);
        this.role = role;
        this.joinedAt = joinedAt;
    }

    public UUID getConversationId() {
        return id.getConversationId();
    }

    public UUID getUserId() {
        return id.getUserId();
    }

    public ParticipantRole getRole() {
        return role;
    }

    public Instant getJoinedAt() {
        return joinedAt;
    }

    public Instant getLastReadAt() {
        return lastReadAt;
    }

    public boolean isOwner() {
        return role == ParticipantRole.OWNER;
    }

    /**
     * Moves the watermark forward.
     *
     * <p>Never backwards: reopening an older part of a thread does not unread
     * what came after it.
     */
    public void readUpTo(Instant moment) {
        if (lastReadAt == null || moment.isAfter(lastReadAt)) {
            lastReadAt = moment;
        }
    }

    /** Hands the group over, used when an owner leaves. */
    public void promoteToOwner() {
        this.role = ParticipantRole.OWNER;
    }
}
