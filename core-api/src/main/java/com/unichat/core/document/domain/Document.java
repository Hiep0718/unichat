package com.unichat.core.document.domain;

import java.time.Instant;
import java.util.UUID;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import jakarta.persistence.Version;

/**
 * Domain entity representing an uploaded document in a workspace.
 */
@Entity
@Table(name = "documents")
public class Document {

    @Id
    @Column(name = "id", nullable = false)
    private UUID id;

    @Column(name = "workspace_id", nullable = false)
    private UUID workspaceId;

    @Column(name = "storage_key", nullable = false, unique = true)
    private String storageKey;

    @Column(name = "original_name", nullable = false)
    private String originalName;

    @Column(name = "media_type", nullable = false)
    private String mediaType;

    @Column(name = "byte_size", nullable = false)
    private long byteSize;

    @Column(name = "sha256", nullable = false, length = 64)
    private String sha256;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false)
    private DocumentStatus status;

    @Column(name = "ingestion_version", nullable = false)
    private int ingestionVersion;

    @Column(name = "page_or_block_count", nullable = false)
    private int pageOrBlockCount;

    @Version
    @Column(name = "version", nullable = false)
    private Long version;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    /** Member who contributed the document. */
    @Column(name = "uploaded_by")
    private UUID uploadedBy;

    /** Owner or editor who approved the contribution, null while pending. */
    @Column(name = "approved_by")
    private UUID approvedBy;

    @Column(name = "approved_at")
    private Instant approvedAt;

    /** Reason shown to the contributor when a contribution is declined. */
    @Column(name = "rejection_reason", length = 500)
    private String rejectionReason;

    /** What the contributed document contains, written by the contributor. */
    @Column(name = "contribution_summary", length = 500)
    private String contributionSummary;

    /** Why the workspace needs it, written by the contributor. */
    @Column(name = "contribution_reason", length = 1000)
    private String contributionReason;

    public Document() {}

    public Document(
            UUID id,
            UUID workspaceId,
            String storageKey,
            String originalName,
            String mediaType,
            long byteSize,
            String sha256,
            DocumentStatus status,
            UUID uploadedBy,
            Instant createdAt) {
        this.uploadedBy = uploadedBy;
        this.id = id;
        this.workspaceId = workspaceId;
        this.storageKey = storageKey;
        this.originalName = originalName;
        this.mediaType = mediaType;
        this.byteSize = byteSize;
        this.sha256 = sha256;
        this.status = status;
        this.ingestionVersion = 1;
        this.pageOrBlockCount = 0;
        this.version = null;
        this.createdAt = createdAt;
        this.updatedAt = createdAt;
    }


    public UUID getId() {
        return id;
    }

    public UUID getWorkspaceId() {
        return workspaceId;
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

    public String getSha256() {
        return sha256;
    }

    public DocumentStatus getStatus() {
        return status;
    }

    public void setStatus(DocumentStatus status) {
        this.status = status;
    }

    public int getIngestionVersion() {
        return ingestionVersion;
    }

    public void setIngestionVersion(int ingestionVersion) {
        this.ingestionVersion = ingestionVersion;
    }

    public int getPageOrBlockCount() {
        return pageOrBlockCount;
    }

    public void setPageOrBlockCount(int pageOrBlockCount) {
        this.pageOrBlockCount = pageOrBlockCount;
    }

    public Long getVersion() {
        return version;
    }

    public void setVersion(Long version) {
        this.version = version;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }

    public Instant getUpdatedAt() {
        return updatedAt;
    }

    public void setUpdatedAt(Instant updatedAt) {
        this.updatedAt = updatedAt;
    }

    public UUID getUploadedBy() {
        return uploadedBy;
    }

    public UUID getApprovedBy() {
        return approvedBy;
    }

    public Instant getApprovedAt() {
        return approvedAt;
    }

    public String getRejectionReason() {
        return rejectionReason;
    }

    public String getContributionSummary() {
        return contributionSummary;
    }

    public String getContributionReason() {
        return contributionReason;
    }

    /**
     * Records what the contributor said about the document at upload time.
     *
     * @param summary what the document contains
     * @param reason  why the workspace needs it
     */
    public void describeContribution(String summary, String reason) {
        this.contributionSummary = summary;
        this.contributionReason = reason;
    }

    /**
     * Marks a contributed document as approved so it can enter ingestion.
     *
     * @param approverId owner or editor who approved it
     * @param approvedAt approval timestamp
     */
    public void approve(UUID approverId, Instant approvedAt) {
        this.status = DocumentStatus.PENDING;
        this.approvedBy = approverId;
        this.approvedAt = approvedAt;
        this.rejectionReason = null;
    }

    /**
     * Declines a contributed document, keeping it out of retrieval permanently.
     *
     * @param approverId owner or editor who declined it
     * @param reason     explanation shown to the contributor
     * @param decidedAt  decision timestamp
     */
    public void reject(UUID approverId, String reason, Instant decidedAt) {
        this.status = DocumentStatus.REJECTED;
        this.approvedBy = approverId;
        this.approvedAt = decidedAt;
        this.rejectionReason = reason;
    }
}
