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
 * <p>Text only: attachments and group threads are deliberately out of scope for
 * this phase, and adding them later needs a schema change rather than a flag.
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

    @Column(name = "body", nullable = false)
    private String body;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    /** When the other participant saw it; null while unread. */
    @Column(name = "read_at")
    private Instant readAt;

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

    public Instant getReadAt() { return readAt; }

    /** Records that the recipient has seen it; the first read stands. */
    public void markRead(Instant readAt) {
        if (this.readAt == null) {
            this.readAt = readAt;
        }
    }
}
