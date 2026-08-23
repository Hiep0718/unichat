package com.unichat.core.chat.api;

import java.time.Instant;
import java.util.UUID;

import com.unichat.core.chat.domain.StudioNote;

/**
 * DTO response representing a saved Studio Note.
 */
public class StudioNoteResponse {

    private UUID id;
    private UUID conversationId;
    private UUID workspaceId;
    private UUID userId;
    private String noteType;
    private String title;
    private String content;
    private String metadata;
    private Instant createdAt;

    public StudioNoteResponse() {}

    public StudioNoteResponse(StudioNote note) {
        this.id = note.getId();
        this.conversationId = note.getConversationId();
        this.workspaceId = note.getWorkspaceId();
        this.userId = note.getUserId();
        this.noteType = note.getNoteType();
        this.title = note.getTitle();
        this.content = note.getContent();
        this.metadata = note.getMetadata();
        this.createdAt = note.getCreatedAt();
    }

    public UUID getId() {
        return id;
    }

    public UUID getConversationId() {
        return conversationId;
    }

    public UUID getWorkspaceId() {
        return workspaceId;
    }

    public UUID getUserId() {
        return userId;
    }

    public String getNoteType() {
        return noteType;
    }

    public String getTitle() {
        return title;
    }

    public String getContent() {
        return content;
    }

    public String getMetadata() {
        return metadata;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }
}
