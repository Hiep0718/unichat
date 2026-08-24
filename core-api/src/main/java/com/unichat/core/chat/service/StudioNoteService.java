package com.unichat.core.chat.service;

import java.time.Clock;
import java.time.Instant;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.unichat.core.chat.api.StudioNoteRequest;
import com.unichat.core.chat.api.StudioNoteResponse;
import com.unichat.core.chat.domain.Conversation;
import com.unichat.core.chat.domain.ConversationRepository;
import com.unichat.core.chat.domain.StudioNote;
import com.unichat.core.chat.domain.StudioNoteRepository;
import com.unichat.core.common.error.NotFoundError;

/**
 * Service managing Studio Notes generated in user conversation sessions.
 */
@Service
public class StudioNoteService {

    private final StudioNoteRepository studioNoteRepository;
    private final ConversationRepository conversationRepository;
    private final Clock clock;

    public StudioNoteService(
            StudioNoteRepository studioNoteRepository,
            ConversationRepository conversationRepository,
            Clock clock) {
        this.studioNoteRepository = studioNoteRepository;
        this.conversationRepository = conversationRepository;
        this.clock = clock;
    }

    /**
     * Lists all studio notes for a specific conversation.
     */
    @Transactional(readOnly = true)
    public List<StudioNoteResponse> getNotesForConversation(UUID workspaceId, UUID conversationId, UUID userId) {
        Conversation conv = conversationRepository.findById(conversationId)
                .orElseThrow(() -> new NotFoundError("Cuộc trò chuyện không tồn tại"));

        if (!conv.getWorkspaceId().equals(workspaceId)) {
            throw new NotFoundError("Cuộc trò chuyện không thuộc workspace này");
        }

        return studioNoteRepository.findByConversationIdOrderByCreatedAtDesc(conversationId)
                .stream()
                .map(StudioNoteResponse::new)
                .collect(Collectors.toList());
    }

    /**
     * Creates a new Studio Note linked to a conversation.
     */
    @Transactional
    public StudioNoteResponse createNote(UUID workspaceId, UUID conversationId, UUID userId, StudioNoteRequest req) {
        Conversation conv = conversationRepository.findById(conversationId)
                .orElseThrow(() -> new NotFoundError("Cuộc trò chuyện không tồn tại"));

        if (!conv.getWorkspaceId().equals(workspaceId)) {
            throw new NotFoundError("Cuộc trò chuyện không thuộc workspace này");
        }

        UUID noteId = UUID.randomUUID();
        Instant now = clock.instant();

        StudioNote note = new StudioNote(
                noteId,
                conversationId,
                workspaceId,
                userId,
                req.getNoteType() != null ? req.getNoteType() : "CHAT_NOTE",
                req.getTitle(),
                req.getContent(),
                req.getMetadata(),
                now
        );

        StudioNote saved = studioNoteRepository.save(note);
        return new StudioNoteResponse(saved);
    }

    /**
     * Deletes a Studio Note by ID.
     */
    @Transactional
    public void deleteNote(UUID workspaceId, UUID conversationId, UUID noteId, UUID userId) {
        StudioNote note = studioNoteRepository.findById(noteId)
                .orElseThrow(() -> new NotFoundError("Ghi chú không tồn tại"));

        if (!note.getConversationId().equals(conversationId) || !note.getWorkspaceId().equals(workspaceId)) {
            throw new NotFoundError("Ghi chú không thuộc hội thoại này");
        }

        studioNoteRepository.delete(note);
    }
}
