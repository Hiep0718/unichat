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
 * A reply within a discussion thread.
 */
@Entity
@Table(name = "discussion_replies")
public class DiscussionReply {

    @Id
    @Column(name = "id", nullable = false)
    private UUID id;

    @Column(name = "discussion_id", nullable = false)
    private UUID discussionId;

    @Column(name = "author_id", nullable = false)
    private UUID authorId;

    @Column(name = "body", nullable = false)
    private String body;

    @Column(name = "parent_reply_id")
    private UUID parentReplyId;

    @Column(name = "is_ai_answer", nullable = false)
    private boolean isAiAnswer;

    @Column(name = "vote_score", nullable = false)
    private int voteScore;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    /** Links an AI reply back to the retrieval run that produced it. */
    @Column(name = "retrieval_trace_id")
    private UUID retrievalTraceId;

    /**
     * Sources behind an AI reply, empty for a human one.
     *
     * <p>Mapped with Hibernate's native JSON support rather than a converter:
     * an AttributeConverter binds the value as varchar, which PostgreSQL
     * refuses to cast to jsonb.
     */
    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "citations", columnDefinition = "jsonb", nullable = false)
    private List<ReplyCitation> citations = new ArrayList<>();

    public DiscussionReply() {}

    public DiscussionReply(UUID id, UUID discussionId, UUID authorId, String body, 
                           UUID parentReplyId, boolean isAiAnswer, Instant createdAt) {
        this.id = id;
        this.discussionId = discussionId;
        this.authorId = authorId;
        this.body = body;
        this.parentReplyId = parentReplyId;
        this.isAiAnswer = isAiAnswer;
        this.voteScore = 0;
        this.createdAt = createdAt;
    }

    public UUID getId() { return id; }
    public UUID getDiscussionId() { return discussionId; }
    public UUID getAuthorId() { return authorId; }
    public String getBody() { return body; }
    public UUID getParentReplyId() { return parentReplyId; }
    public boolean isAiAnswer() { return isAiAnswer; }
    public Instant getCreatedAt() { return createdAt; }
    public int getVoteScore() { return voteScore; }
    
    public void setBody(String body) { this.body = body; }
    public void adjustVoteScore(int delta) { this.voteScore += delta; }

    public UUID getRetrievalTraceId() { return retrievalTraceId; }

    public void setRetrievalTraceId(UUID retrievalTraceId) { this.retrievalTraceId = retrievalTraceId; }

    public List<ReplyCitation> getCitations() { return citations; }

    /** Records the sources an AI answer drew on. */
    public void setCitations(List<ReplyCitation> citations) {
        this.citations = citations != null ? citations : new ArrayList<>();
    }
}
