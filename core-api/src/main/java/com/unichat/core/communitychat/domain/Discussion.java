package com.unichat.core.communitychat.domain;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

/**
 * A discussion thread within a community workspace.
 */
@Entity
@Table(name = "discussions")
public class Discussion {

    @Id
    @Column(name = "id", nullable = false)
    private UUID id;

    @Column(name = "workspace_id", nullable = false)
    private UUID workspaceId;

    @Column(name = "author_id", nullable = false)
    private UUID authorId;

    @Column(name = "title", nullable = false, length = 200)
    private String title;

    @Column(name = "body", nullable = false)
    private String body;

    @Column(name = "label", length = 20)
    private String label; // QUESTION, DISCUSSION, ANNOUNCEMENT

    @Column(name = "pinned", nullable = false)
    private boolean pinned;

    @Column(name = "status", nullable = false, length = 20)
    private String status; // OPEN, CLOSED, ARCHIVED

    @Column(name = "view_count", nullable = false)
    private int viewCount;

    @Column(name = "reply_count", nullable = false)
    private int replyCount;

    @Column(name = "vote_score", nullable = false)
    private int voteScore;

    /**
     * Mapped with Hibernate's native JSON support rather than a string
     * converter: an {@code AttributeConverter} binds the value as {@code
     * varchar}, and PostgreSQL refuses to cast varchar to jsonb, which failed
     * every insert with "column tags is of type jsonb but expression is of type
     * character varying".
     */
    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "tags", columnDefinition = "jsonb", nullable = false)
    private List<String> tags = new ArrayList<>();

    @Column(name = "accepted_reply_id")
    private UUID acceptedReplyId;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    public Discussion() {}

    public Discussion(UUID id, UUID workspaceId, UUID authorId, String title, String body, 
                      String label, boolean pinned, String status, Instant now) {
        this.id = id;
        this.workspaceId = workspaceId;
        this.authorId = authorId;
        this.title = title;
        this.body = body;
        this.label = label;
        this.pinned = pinned;
        this.status = status;
        this.viewCount = 0;
        this.replyCount = 0;
        this.voteScore = 0;
        this.createdAt = now;
        this.updatedAt = now;
    }

    public UUID getId() { return id; }
    public UUID getWorkspaceId() { return workspaceId; }
    public UUID getAuthorId() { return authorId; }
    public String getTitle() { return title; }
    public String getBody() { return body; }
    public String getLabel() { return label; }
    public boolean isPinned() { return pinned; }
    public String getStatus() { return status; }
    public int getViewCount() { return viewCount; }
    public int getReplyCount() { return replyCount; }
    public Instant getCreatedAt() { return createdAt; }
    public Instant getUpdatedAt() { return updatedAt; }

    public void setTitle(String title) { this.title = title; }
    public void setBody(String body) { this.body = body; }
    public void setLabel(String label) { this.label = label; }
    public void setPinned(boolean pinned) { this.pinned = pinned; }
    public void setStatus(String status) { this.status = status; }
    public void setUpdatedAt(Instant updatedAt) { this.updatedAt = updatedAt; }
    
    public void incrementViewCount() { this.viewCount++; }
    public void incrementReplyCount() { this.replyCount++; }
    public int getVoteScore() { return voteScore; }
    public void adjustVoteScore(int delta) { this.voteScore += delta; }

    public List<String> getTags() { return tags; }
    public void setTags(List<String> tags) { this.tags = tags != null ? tags : new ArrayList<>(); }
    public UUID getAcceptedReplyId() { return acceptedReplyId; }
    public void setAcceptedReplyId(UUID acceptedReplyId) { this.acceptedReplyId = acceptedReplyId; }
}
