package com.unichat.core.chat.domain;

import java.util.UUID;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

/**
 * Domain entity representing a document citation in message history.
 */
@Entity
@Table(name = "citation_history")
public class CitationHistory {

    @Id
    @Column(name = "id", nullable = false)
    private UUID id;

    @Column(name = "message_id", nullable = false)
    private UUID messageId;

    @Column(name = "document_id", nullable = false)
    private UUID documentId;

    @Column(name = "chunk_id", nullable = false)
    private String chunkId;

    @Column(name = "file_name", nullable = false)
    private String fileName;

    @Column(name = "locator_type", nullable = false)
    private String locatorType;

    @Column(name = "locator_value", nullable = false)
    private String locatorValue;

    @Column(name = "excerpt", nullable = false, columnDefinition = "TEXT")
    private String excerpt;

    @Column(name = "content_hash", nullable = false)
    private String contentHash;

    @Column(name = "ordinal", nullable = false)
    private int ordinal;

    public CitationHistory() {}

    public CitationHistory(
            UUID id,
            UUID messageId,
            UUID documentId,
            String chunkId,
            String fileName,
            String locatorType,
            String locatorValue,
            String excerpt,
            String contentHash,
            int ordinal) {
        this.id = id;
        this.messageId = messageId;
        this.documentId = documentId;
        this.chunkId = chunkId;
        this.fileName = fileName;
        this.locatorType = locatorType;
        this.locatorValue = locatorValue;
        this.excerpt = excerpt;
        this.contentHash = contentHash;
        this.ordinal = ordinal;
    }

    public UUID getId() {
        return id;
    }

    public UUID getMessageId() {
        return messageId;
    }

    public UUID getDocumentId() {
        return documentId;
    }

    public String getChunkId() {
        return chunkId;
    }

    public String getFileName() {
        return fileName;
    }

    public String getLocatorType() {
        return locatorType;
    }

    public String getLocatorValue() {
        return locatorValue;
    }

    public String getExcerpt() {
        return excerpt;
    }

    public String getContentHash() {
        return contentHash;
    }

    public int getOrdinal() {
        return ordinal;
    }
}
