package com.unichat.core.chat.api;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/**
 * Request payload for creating a new Studio Note in a conversation.
 */
public class StudioNoteRequest {

    @NotBlank(message = "Loại ghi chú không được để trống")
    @Size(max = 50, message = "Loại ghi chú tối đa 50 ký tự")
    private String noteType;

    @NotBlank(message = "Tiêu đề không được để trống")
    @Size(max = 255, message = "Tiêu đề tối đa 255 ký tự")
    private String title;

    @NotBlank(message = "Nội dung không được để trống")
    private String content;

    private String metadata;

    public StudioNoteRequest() {}

    public StudioNoteRequest(String noteType, String title, String content, String metadata) {
        this.noteType = noteType;
        this.title = title;
        this.content = content;
        this.metadata = metadata;
    }

    public String getNoteType() {
        return noteType;
    }

    public void setNoteType(String noteType) {
        this.noteType = noteType;
    }

    public String getTitle() {
        return title;
    }

    public void setTitle(String title) {
        this.title = title;
    }

    public String getContent() {
        return content;
    }

    public void setContent(String content) {
        this.content = content;
    }

    public String getMetadata() {
        return metadata;
    }

    public void setMetadata(String metadata) {
        this.metadata = metadata;
    }
}
