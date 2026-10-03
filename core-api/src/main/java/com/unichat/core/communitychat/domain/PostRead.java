package com.unichat.core.communitychat.domain;

import java.time.Instant;
import java.util.UUID;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EmbeddedId;
import jakarta.persistence.Table;

/**
 * Records that a member opened a post.
 *
 * <p>Exists so the author of an announcement can tell whether it reached the
 * group, rather than guessing from replies.
 */
@Entity
@Table(name = "post_reads")
public class PostRead {

    @EmbeddedId
    private PostReadId id;

    @Column(name = "read_at", nullable = false)
    private Instant readAt;

    protected PostRead() {}

    public PostRead(UUID discussionId, UUID userId, Instant readAt) {
        this.id = new PostReadId(discussionId, userId);
        this.readAt = readAt;
    }

    public UUID getDiscussionId() {
        return id.getDiscussionId();
    }

    public UUID getUserId() {
        return id.getUserId();
    }

    public Instant getReadAt() {
        return readAt;
    }
}
