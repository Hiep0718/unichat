package com.unichat.core.communitychat.domain;

import java.time.Instant;
import java.util.UUID;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

/**
 * A user bookmark on a discussion post (Reddit-style save).
 */
@Entity
@Table(name = "bookmarks")
public class Bookmark {

    @Id
    @Column(name = "id", nullable = false)
    private UUID id;

    @Column(name = "user_id", nullable = false)
    private UUID userId;

    @Column(name = "discussion_id", nullable = false)
    private UUID discussionId;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    public Bookmark() {}

    public Bookmark(UUID id, UUID userId, UUID discussionId, Instant createdAt) {
        this.id = id;
        this.userId = userId;
        this.discussionId = discussionId;
        this.createdAt = createdAt;
    }

    public UUID getId() { return id; }
    public UUID getUserId() { return userId; }
    public UUID getDiscussionId() { return discussionId; }
    public Instant getCreatedAt() { return createdAt; }
}
