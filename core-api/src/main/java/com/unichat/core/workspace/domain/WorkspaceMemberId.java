package com.unichat.core.workspace.domain;

import java.io.Serializable;
import java.util.Objects;
import java.util.UUID;

/**
 * Composite primary key for WorkspaceMember.
 */
public class WorkspaceMemberId implements Serializable {

    private static final long serialVersionUID = 1L;

    private UUID workspaceId;
    private UUID userId;

    public WorkspaceMemberId() {}

    public WorkspaceMemberId(UUID workspaceId, UUID userId) {
        this.workspaceId = workspaceId;
        this.userId = userId;
    }

    public UUID getWorkspaceId() {
        return workspaceId;
    }

    public UUID getUserId() {
        return userId;
    }

    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (o == null || getClass() != o.getClass()) return false;
        WorkspaceMemberId that = (WorkspaceMemberId) o;
        return Objects.equals(workspaceId, that.workspaceId) &&
               Objects.equals(userId, that.userId);
    }

    @Override
    public int hashCode() {
        return Objects.hash(workspaceId, userId);
    }
}
