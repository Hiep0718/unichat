package com.unichat.core.workspace.domain;

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
 * Workspace boundary hosting documents, conversations, and access controls.
 */
@Entity
@Table(name = "workspaces")
public class Workspace {

    @Id
    @Column(name = "id", nullable = false)
    private UUID id;

    @Column(name = "owner_id", nullable = false)
    private UUID ownerId;

    @Column(name = "name", nullable = false)
    private String name;

    @Column(name = "description")
    private String description;

    @Enumerated(EnumType.STRING)
    @Column(name = "visibility", nullable = false)
    private WorkspaceVisibility visibility;

    @Column(name = "cloud_allowed", nullable = false)
    private boolean cloudAllowed;

    @Column(name = "permission_version", nullable = false)
    private long permissionVersion;

    @Version
    @Column(name = "version", nullable = false)
    private long version;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    public Workspace() {}

    /**
     * Constructs a new Workspace.
     */
    public Workspace(UUID id, UUID ownerId, String name, String description, WorkspaceVisibility visibility, boolean cloudAllowed, Instant now) {
        this.id = id;
        this.ownerId = ownerId;
        this.name = name;
        this.description = description;
        this.visibility = visibility;
        this.cloudAllowed = cloudAllowed;
        this.permissionVersion = 0;
        this.version = 0;
        this.createdAt = now;
        this.updatedAt = now;
    }

    public UUID getId() {
        return id;
    }

    public UUID getOwnerId() {
        return ownerId;
    }

    public void setOwnerId(UUID ownerId) {
        this.ownerId = ownerId;
    }

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public String getDescription() {
        return description;
    }

    public void setDescription(String description) {
        this.description = description;
    }

    public WorkspaceVisibility getVisibility() {
        return visibility;
    }

    public void setVisibility(WorkspaceVisibility visibility) {
        this.visibility = visibility;
    }

    public boolean isCloudAllowed() {
        return cloudAllowed;
    }

    public void setCloudAllowed(boolean cloudAllowed) {
        this.cloudAllowed = cloudAllowed;
    }

    public long getPermissionVersion() {
        return permissionVersion;
    }

    public void incrementPermissionVersion() {
        this.permissionVersion++;
    }

    public long getVersion() {
        return version;
    }

    public void setVersion(long version) {
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
}
