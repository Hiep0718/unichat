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
 * One topic attached to one workspace.
 *
 * <p>A row per pair rather than a column on the workspace, because a space is
 * usually about more than one thing: a group on MongoDB is both a database
 * group and a programming group, and forcing a single choice would file it
 * under whichever its owner happened to pick first.
 *
 * <p>Loaded for a whole page at once by {@link
 * com.unichat.core.workspace.service.WorkspaceStatsLoader}, never per card.
 */
@Entity
@Table(name = "workspace_topics")
@IdClass(WorkspaceTopicId.class)
public class WorkspaceTopicAssignment {

    @Id
    @Column(name = "workspace_id", nullable = false, updatable = false)
    private UUID workspaceId;

    @Id
    @Enumerated(EnumType.STRING)
    @Column(name = "topic", nullable = false, updatable = false)
    private WorkspaceTopic topic;

    protected WorkspaceTopicAssignment() {}

    public WorkspaceTopicAssignment(UUID workspaceId, WorkspaceTopic topic) {
        this.workspaceId = workspaceId;
        this.topic = topic;
    }

    public UUID getWorkspaceId() {
        return workspaceId;
    }

    public WorkspaceTopic getTopic() {
        return topic;
    }
}
