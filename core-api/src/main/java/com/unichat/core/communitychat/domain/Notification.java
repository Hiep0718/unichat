package com.unichat.core.communitychat.domain;

import java.time.Instant;
import java.util.UUID;

import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

@Entity
@Table(name = "notifications")
public class Notification {

    @Id
    @Column(name = "id", nullable = false)
    private UUID id;

    @Column(name = "user_id", nullable = false)
    private UUID userId;

    @Column(name = "type", nullable = false, length = 30)
    private String type;

    @Column(name = "workspace_id")
    private UUID workspaceId;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "payload", nullable = false)
    private String payload; // Stores JSON as a string representation

    @Column(name = "is_read", nullable = false)
    private boolean isRead;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    public Notification() {}

    public Notification(UUID id, UUID userId, String type, UUID workspaceId, String payload, Instant createdAt) {
        this.id = id;
        this.userId = userId;
        this.type = type;
        this.workspaceId = workspaceId;
        this.payload = payload;
        this.isRead = false;
        this.createdAt = createdAt;
    }

    public UUID getId() { return id; }
    public UUID getUserId() { return userId; }
    public String getType() { return type; }
    public UUID getWorkspaceId() { return workspaceId; }
    public String getPayload() { return payload; }
    public boolean isRead() { return isRead; }
    public Instant getCreatedAt() { return createdAt; }

    public void setRead(boolean read) { isRead = read; }
}
