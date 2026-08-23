package com.unichat.core.chat.api;

import java.util.List;
import java.util.UUID;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.unichat.core.chat.service.StudioNoteService;

import jakarta.validation.Valid;

/**
 * REST controller for managing Studio Notes in user conversation sessions.
 */
@RestController
@RequestMapping("/api/v1/workspaces/{workspaceId}/conversations/{conversationId}/studio-notes")
public class StudioNoteController {

    private final StudioNoteService studioNoteService;

    public StudioNoteController(StudioNoteService studioNoteService) {
        this.studioNoteService = studioNoteService;
    }

    /**
     * Lists all studio notes for a specific conversation.
     */
    @GetMapping
    public ResponseEntity<List<StudioNoteResponse>> getNotesForConversation(
            @AuthenticationPrincipal Jwt jwt,
            @PathVariable("workspaceId") UUID workspaceId,
            @PathVariable("conversationId") UUID conversationId) {
        UUID userId = UUID.fromString(jwt.getSubject());
        List<StudioNoteResponse> notes = studioNoteService.getNotesForConversation(workspaceId, conversationId, userId);
        return ResponseEntity.ok(notes);
    }

    /**
     * Creates a new Studio Note linked to a conversation.
     */
    @PostMapping
    public ResponseEntity<StudioNoteResponse> createNote(
            @AuthenticationPrincipal Jwt jwt,
            @PathVariable("workspaceId") UUID workspaceId,
            @PathVariable("conversationId") UUID conversationId,
            @Valid @RequestBody StudioNoteRequest req) {
        UUID userId = UUID.fromString(jwt.getSubject());
        StudioNoteResponse response = studioNoteService.createNote(workspaceId, conversationId, userId, req);
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    /**
     * Deletes a Studio Note by ID.
     */
    @DeleteMapping("/{noteId}")
    public ResponseEntity<Void> deleteNote(
            @AuthenticationPrincipal Jwt jwt,
            @PathVariable("workspaceId") UUID workspaceId,
            @PathVariable("conversationId") UUID conversationId,
            @PathVariable("noteId") UUID noteId) {
        UUID userId = UUID.fromString(jwt.getSubject());
        studioNoteService.deleteNote(workspaceId, conversationId, noteId, userId);
        return ResponseEntity.noContent().build();
    }
}
