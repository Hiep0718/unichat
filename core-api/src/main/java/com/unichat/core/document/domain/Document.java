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

    @Column(name = "contributor_id")
    private UUID contributorId;

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
            Instant createdAt) {
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
        this.version = 0L;
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

    public UUID getContributorId() {
        return contributorId;
    }

    public void setContributorId(UUID contributorId) {
        this.contributorId = contributorId;
    }
}
