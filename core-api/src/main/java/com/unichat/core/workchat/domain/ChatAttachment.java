package com.unichat.core.workchat.domain;

import java.time.Instant;
import java.util.UUID;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

/**
 * A file sent as part of a message.
 *
 * <p>Belongs to the message rather than to the conversation, so that a file and
 * the text it came with are one thing that arrives together: live delivery
 * pushes the message after commit, and a reader must never see a bubble whose
 * file has not been stored yet.
 *
 * <p>Private to the conversation. There is no library entry and no ingestion:
 * see {@link ChatAttachmentKind} for why that is a property of the design and
 * not something waiting to be added.
 */
@Entity
@Table(name = "chat_attachments")
public class ChatAttachment {

    @Id
    @Column(name = "id", nullable = false)
    private UUID id;

    @Column(name = "message_id", nullable = false, updatable = false)
    private UUID messageId;

    @Enumerated(EnumType.STRING)
    @Column(name = "kind", nullable = false, updatable = false)
    private ChatAttachmentKind kind;

    /** Where the bytes live. Never returned to a client. */
    @Column(name = "storage_key", nullable = false, updatable = false)
    private String storageKey;

    @Column(name = "original_name", nullable = false, updatable = false)
    private String originalName;

    @Column(name = "media_type", nullable = false, updatable = false)
    private String mediaType;

    @Column(name = "byte_size", nullable = false, updatable = false)
    private long byteSize;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    protected ChatAttachment() {}

    public ChatAttachment(UUID id, UUID messageId, ChatAttachmentKind kind, String storageKey,
                          String originalName, String mediaType, long byteSize, Instant createdAt) {
        this.id = id;
        this.messageId = messageId;
        this.kind = kind;
        this.storageKey = storageKey;
        this.originalName = originalName;
        this.mediaType = mediaType;
        this.byteSize = byteSize;
        this.createdAt = createdAt;
    }

    public UUID getId() { return id; }

    public UUID getMessageId() { return messageId; }

    public ChatAttachmentKind getKind() { return kind; }

    public String getStorageKey() { return storageKey; }

    public String getOriginalName() { return originalName; }

    public String getMediaType() { return mediaType; }

    public long getByteSize() { return byteSize; }

    public Instant getCreatedAt() { return createdAt; }
}
