package com.unichat.core.communitychat.domain;

import java.io.Serializable;
import java.util.Objects;
import java.util.UUID;

import jakarta.persistence.Column;
import jakarta.persistence.Embeddable;

/** Composite key of {@link PostRead}: one row per member per post. */
@Embeddable
public class PostReadId implements Serializable {

    private static final long serialVersionUID = 1L;

    @Column(name = "discussion_id", nullable = false)
    private UUID discussionId;

    @Column(name = "user_id", nullable = false)
    private UUID userId;

    protected PostReadId() {}

    public PostReadId(UUID discussionId, UUID userId) {
        this.discussionId = discussionId;
        this.userId = userId;
    }

    public UUID getDiscussionId() {
        return discussionId;
    }

    public UUID getUserId() {
        return userId;
    }

    @Override
    public boolean equals(Object other) {
        if (this == other) {
            return true;
        }
        if (!(other instanceof PostReadId that)) {
            return false;
        }
        return Objects.equals(discussionId, that.discussionId)
                && Objects.equals(userId, that.userId);
    }

    @Override
    public int hashCode() {
        return Objects.hash(discussionId, userId);
    }
}
