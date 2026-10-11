package com.unichat.core.chat.api;

import java.util.Map;
import java.util.UUID;
import jakarta.validation.Valid;
import org.springframework.data.domain.Page;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.*;
import com.unichat.core.chat.service.ChatActor;
import com.unichat.core.chat.service.StudioNoteService;

/** Owned source-safe notes; no new Studio generators are exposed. */
@RestController
@RequestMapping("/api/v1/workspaces/{workspaceId}/conversations/{conversationId}/studio-notes")
public class StudioNoteController {
    private final StudioNoteService notes;
    /** Receives the note ownership/provenance boundary. */
    public StudioNoteController(StudioNoteService notes) { this.notes=notes; }
    /** Returns a bounded page of readable or explicitly redacted notes. */
    @GetMapping
    public Page<StudioNoteResponse> getNotesForConversation(@AuthenticationPrincipal Jwt jwt,@PathVariable UUID workspaceId,
            @PathVariable UUID conversationId,@RequestParam Map<String,String> query) {
        return notes.getNotesForConversation(workspaceId,conversationId,ChatActor.from(jwt),ChatPagination.parse(query,false));
    }
    /** Inherits dependencies from the requested final source turn. */
    @PostMapping
    public ResponseEntity<StudioNoteResponse> createNote(@AuthenticationPrincipal Jwt jwt,@PathVariable UUID workspaceId,
            @PathVariable UUID conversationId,@Valid @RequestBody StudioNoteRequest request) {
        return ResponseEntity.status(201).body(notes.createNote(workspaceId,conversationId,ChatActor.from(jwt),request));
    }
    /** Requires the note owner, conversation owner and exact workspace path. */
    @DeleteMapping("/{noteId}")
    public ResponseEntity<Void> deleteNote(@AuthenticationPrincipal Jwt jwt,@PathVariable UUID workspaceId,
            @PathVariable UUID conversationId,@PathVariable UUID noteId) {
        notes.deleteNote(workspaceId,conversationId,noteId,ChatActor.from(jwt));
        return ResponseEntity.noContent().build();
    }
}
