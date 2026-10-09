package com.unichat.core.workchat.domain;

import java.time.Instant;
import java.util.UUID;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

/**
 * One message in a direct conversation.
 *
 * <p>The text is optional, because a message may carry only files. Blank text
 * is stored as null rather than as an empty string, so a bug cannot produce an
 * empty bubble; {@link ChatAttachment} holds anything sent with it.
 *
 * <p>Nothing here records who has read it. In a conversation with several
 * people that is a fact about each of them, so it lives on
 * {@link ConversationParticipant} as a watermark (V31).
 */
@Entity
@Table(name = "direct_messages")
public class DirectMessage {

    @Id
    @Column(name = "id", nullable = false)
    private UUID id;

    @Column(name = "conversation_id", nullable = false, updatable = false)
    private UUID conversationId;

    @Column(name = "sender_id", nullable = false, updatable = false)
    private UUID senderId;

    /** Null in a message that is only files. Never blank. */
    @Column(name = "body")
    private String body;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    protected DirectMessage() {}

    public DirectMessage(UUID id, UUID conversationId, UUID senderId, String body, Instant createdAt) {
        this.id = id;
        this.conversationId = conversationId;
        this.senderId = senderId;
        this.body = body;
        this.createdAt = createdAt;
    }

    public UUID getId() { return id; }

    public UUID getConversationId() { return conversationId; }

    public UUID getSenderId() { return senderId; }

    public String getBody() { return body; }

    public Instant getCreatedAt() { return createdAt; }
}
