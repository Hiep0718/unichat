package com.unichat.core.communitychat.domain;

import java.time.Instant;
import java.util.UUID;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

/**
 * A message sent within a community channel.
 */
@Entity
@Table(name = "community_messages")
public class CommunityMessage {

    @Id
    @Column(name = "id", nullable = false)
    private UUID id;

    @Column(name = "channel_id", nullable = false)
    private UUID channelId;

    @Column(name = "author_id", nullable = false)
    private UUID authorId;

    @Enumerated(EnumType.STRING)
    @Column(name = "author_type", nullable = false, length = 10)
    private MessageAuthorType authorType;

    @Column(name = "content", nullable = false)
    private String content;

    @Column(name = "reply_to_id")
    private UUID replyToId;

    @Column(name = "mentions_ai", nullable = false)
    private boolean mentionsAi;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    public CommunityMessage() {}

    public CommunityMessage(UUID id, UUID channelId, UUID authorId, MessageAuthorType authorType,
                            String content, UUID replyToId, boolean mentionsAi, Instant createdAt) {
        this.id = id;
        this.channelId = channelId;
        this.authorId = authorId;
        this.authorType = authorType;
        this.content = content;
        this.replyToId = replyToId;
        this.mentionsAi = mentionsAi;
        this.createdAt = createdAt;
    }

    public UUID getId() { return id; }
    public UUID getChannelId() { return channelId; }
    public UUID getAuthorId() { return authorId; }
    public MessageAuthorType getAuthorType() { return authorType; }
    public String getContent() { return content; }
    public UUID getReplyToId() { return replyToId; }
    public boolean isMentionsAi() { return mentionsAi; }
    public Instant getCreatedAt() { return createdAt; }
}
