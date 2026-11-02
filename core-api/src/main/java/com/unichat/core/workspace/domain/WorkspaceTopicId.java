package com.unichat.core.workspace.domain;

import java.io.Serializable;
import java.util.Objects;
import java.util.UUID;

/** Composite key of {@link WorkspaceTopicAssignment}: one row per pair. */
public class WorkspaceTopicId implements Serializable {

    private static final long serialVersionUID = 1L;

    private UUID workspaceId;
    private WorkspaceTopic topic;

    public WorkspaceTopicId() {}

    public WorkspaceTopicId(UUID workspaceId, WorkspaceTopic topic) {
        this.workspaceId = workspaceId;
        this.topic = topic;
    }

    public UUID getWorkspaceId() {
        return workspaceId;
    }

    public WorkspaceTopic getTopic() {
        return topic;
    }

    @Override
    public boolean equals(Object other) {
        if (this == other) return true;
        if (other == null || getClass() != other.getClass()) return false;
        WorkspaceTopicId that = (WorkspaceTopicId) other;
        return Objects.equals(workspaceId, that.workspaceId) && topic == that.topic;
    }

    @Override
    public int hashCode() {
        return Objects.hash(workspaceId, topic);
    }
}
