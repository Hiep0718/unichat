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
    private boolean redacted;
    private UUID sourceMessageId;

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
        this.sourceMessageId = note.getSourceMessageId();
    }

    /** Hides every derived field when legacy or current provenance cannot be verified. */
    public StudioNoteResponse(StudioNote note, boolean readable) {
        this(note);
        this.redacted = !readable;
        if (!readable) {
            this.title = "Ghi chú không còn khả dụng";
            this.content = "Quyền nguồn đã thay đổi hoặc thiếu thông tin xác minh.";
            this.metadata = null;
        }
    }
    /** Signals that derived fields have been withheld. */
    public boolean isRedacted() { return redacted; }
    /** Identifies the source turn without exposing its content. */
    public UUID getSourceMessageId() { return sourceMessageId; }

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
