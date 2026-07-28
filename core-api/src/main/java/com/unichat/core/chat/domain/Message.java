package com.unichat.core.chat.domain;

import java.time.Instant;
import java.util.UUID;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

/**
 * Domain entity representing a message in a conversation.
 */
@Entity
@Table(name = "messages")
public class Message {

    @Id
    @Column(name = "id", nullable = false)
    private UUID id;

    @Column(name = "conversation_id", nullable = false)
    private UUID conversationId;

    @Column(name = "role", nullable = false)
    private String role;

    @Column(name = "content", nullable = false, columnDefinition = "TEXT")
    private String content;

    @Column(name = "intent")
    private String intent;

    @Column(name = "refusal_code")
    private String refusalCode;

    @Column(name = "provider_model")
    private String providerModel;

    @Column(name = "prompt_version")
    private String promptVersion;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    public Message() {}

    public Message(
            UUID id,
            UUID conversationId,
            String role,
            String content,
            String intent,
            String refusalCode,
            String providerModel,
            Instant createdAt) {
        this.id = id;
        this.conversationId = conversationId;
        this.role = role;
        this.content = content;
        this.intent = intent;
        this.refusalCode = refusalCode;
        this.providerModel = providerModel;
        this.promptVersion = "v1.0";
        this.createdAt = createdAt;
    }

    public UUID getId() {
        return id;
    }

    public UUID getConversationId() {
        return conversationId;
    }

    public String getRole() {
        return role;
    }

    public String getContent() {
        return content;
    }

    public String getIntent() {
        return intent;
    }

    public String getRefusalCode() {
        return refusalCode;
    }

    public String getProviderModel() {
        return providerModel;
    }

    public String getPromptVersion() {
        return promptVersion;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }
}
