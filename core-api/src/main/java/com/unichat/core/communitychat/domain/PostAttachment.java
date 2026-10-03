package com.unichat.core.communitychat.domain;

import java.time.Instant;
import java.util.UUID;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

/**
 * A file attached to a post.
 *
 * <p>A {@link AttachmentKind#DOCUMENT} attachment is also registered in the
 * workspace document library, so the group's AI assistant can read and cite it;
 * {@link AttachmentKind#IMAGE} attachments are display-only and never become
 * retrieval sources.
 */
@Entity
@Table(name = "post_attachments")
public class PostAttachment {

    @Id
    @Column(name = "id", nullable = false)
    private UUID id;

    @Column(name = "discussion_id", nullable = false)
    private UUID discussionId;

    @Enumerated(EnumType.STRING)
    @Column(name = "kind", nullable = false)
    private AttachmentKind kind;

    @Column(name = "storage_key", nullable = false)
    private String storageKey;

    @Column(name = "original_name", nullable = false)
    private String originalName;

    @Column(name = "media_type", nullable = false)
    private String mediaType;

    @Column(name = "byte_size", nullable = false)
    private long byteSize;

    /** Document library entry created for this attachment, null for images. */
    @Column(name = "document_id")
    private UUID documentId;

    @Column(name = "uploaded_by", nullable = false)
    private UUID uploadedBy;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    /** Assistant's summary of the document, null until one is produced. */
    @Column(name = "ai_summary")
    private String aiSummary;

    @Enumerated(EnumType.STRING)
    @Column(name = "summary_state", nullable = false)
    private SummaryState summaryState = SummaryState.PENDING;

    protected PostAttachment() {}

    public PostAttachment(UUID id, UUID discussionId, AttachmentKind kind, String storageKey,
                          String originalName, String mediaType, long byteSize,
                          UUID documentId, UUID uploadedBy, Instant createdAt) {
        this.id = id;
        this.discussionId = discussionId;
        this.kind = kind;
        this.storageKey = storageKey;
        this.originalName = originalName;
        this.mediaType = mediaType;
        this.byteSize = byteSize;
        this.documentId = documentId;
        this.uploadedBy = uploadedBy;
        this.createdAt = createdAt;
        // An image is never retrieved, so it is not merely un-summarised yet.
        this.summaryState = kind == AttachmentKind.IMAGE
                ? SummaryState.NOT_APPLICABLE
                : SummaryState.PENDING;
    }

    public UUID getId() {
        return id;
    }

    public UUID getDiscussionId() {
        return discussionId;
    }

    public AttachmentKind getKind() {
        return kind;
    }

    public String getStorageKey() {
        return storageKey;
    }

    public String getOriginalName() {
        return originalName;
    }

    public String getMediaType() {
        return mediaType;
    }

    public long getByteSize() {
        return byteSize;
    }

    public UUID getDocumentId() {
        return documentId;
    }

    public UUID getUploadedBy() {
        return uploadedBy;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }

    public String getAiSummary() {
        return aiSummary;
    }

    public SummaryState getSummaryState() {
        return summaryState;
    }

    /** Records a summary the assistant produced for this document. */
    public void attachSummary(String summary) {
        this.aiSummary = summary;
        this.summaryState = SummaryState.READY;
    }

    /** Marks that no summary is coming, so the UI stops promising one. */
    public void markSummaryUnavailable() {
        this.summaryState = SummaryState.UNAVAILABLE;
    }
}
