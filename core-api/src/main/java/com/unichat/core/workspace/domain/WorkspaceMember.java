package com.unichat.core.workspace.domain;

import java.util.UUID;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Id;
import jakarta.persistence.IdClass;
import jakarta.persistence.Table;

/**
 * Membership representation mapping a user to a workspace with roles.
 */
@Entity
@Table(name = "workspace_members")
@IdClass(WorkspaceMemberId.class)
public class WorkspaceMember {

    @Id
    @Column(name = "workspace_id", nullable = false)
    private UUID workspaceId;

    @Id
    @Column(name = "user_id", nullable = false)
    private UUID userId;

    @Enumerated(EnumType.STRING)
    @Column(name = "role", nullable = false)
    private WorkspaceRole role;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false)
    private WorkspaceMemberStatus status;

    @Column(name = "invited_by_id")
    private UUID invitedById;

    public WorkspaceMember() {}

    /**
     * Constructs a new WorkspaceMember.
     */
    public WorkspaceMember(UUID workspaceId, UUID userId, WorkspaceRole role, WorkspaceMemberStatus status, UUID invitedById) {
        this.workspaceId = workspaceId;
        this.userId = userId;
        this.role = role;
        this.status = status;
        this.invitedById = invitedById;
    }

    public UUID getWorkspaceId() {
        return workspaceId;
    }

    public UUID getUserId() {
        return userId;
    }

    public WorkspaceRole getRole() {
        return role;
    }

    public void setRole(WorkspaceRole role) {
        this.role = role;
    }

    public WorkspaceMemberStatus getStatus() {
        return status;
    }

    public void setStatus(WorkspaceMemberStatus status) {
        this.status = status;
    }

    public UUID getInvitedById() {
        return invitedById;
    }

    public void setInvitedById(UUID invitedById) {
        this.invitedById = invitedById;
    }
}
