package com.unichat.core.chat.service;

import java.time.Clock;
import java.util.UUID;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import com.unichat.core.chat.api.StudioNoteRequest;
import com.unichat.core.chat.api.StudioNoteResponse;
import com.unichat.core.chat.domain.StudioNote;
import com.unichat.core.chat.domain.StudioNoteRepository;
import com.unichat.core.common.error.NotFoundError;
import com.unichat.core.common.error.ValidationError;

/** Protects existing saved notes through ownership and inherited source dependencies. */
@Service
public class StudioNoteService {
    private final StudioNoteRepository notes;
    private final ChatConversationStore conversations;
    private final ChatAccessService access;
    private final ChatMessageStore messages;
    private final Clock clock;
    /** Receives read-only source policy, never a generator or ingestion service. */
    public StudioNoteService(StudioNoteRepository notes,ChatConversationStore conversations,ChatAccessService access,
            ChatMessageStore messages,Clock clock) {
        this.notes=notes;this.conversations=conversations;this.access=access;this.messages=messages;this.clock=clock;
    }
    /** Pages only owned notes and withholds all derived content when provenance is invalid. */
    @Transactional(readOnly=true)
    public Page<StudioNoteResponse> getNotesForConversation(UUID workspaceId,UUID conversationId,ChatActor actor,Pageable pageable) {
        var sources=access.read(actor,workspaceId);
        conversations.requireOwner(actor.userId(),workspaceId,conversationId,false);
        return notes.findByConversationIdAndUserIdOrderByCreatedAtDescIdDesc(conversationId,actor.userId(),pageable)
                .map(note -> new StudioNoteResponse(note,readable(note,sources)));
    }
    /** Saves a chat note inheriting a genuine final source message. */
    @Transactional
    public StudioNoteResponse createNote(UUID workspaceId,UUID conversationId,ChatActor actor,StudioNoteRequest request) {
        conversations.lockActor(actor.userId());
        conversations.requireOwner(actor.userId(),workspaceId,conversationId,true);
        conversations.lockSources(actor,workspaceId);
        var sources=access.read(actor,workspaceId);
        if (request.getSourceMessageId()==null || !messages.sourceMessage(request.getSourceMessageId(),conversationId,sources)) {
            throw new ValidationError("Ghi chú phải liên kết với câu trả lời còn quyền đọc.");
        }
        var note=new StudioNote(UUID.randomUUID(),conversationId,workspaceId,actor.userId(),request.getNoteType(),
                request.getTitle(),request.getContent(),request.getMetadata(),clock.instant());
        note.bindSource(request.getSourceMessageId(),sources.fingerprint());
        return new StudioNoteResponse(notes.save(note),true);
    }
    /** Deletes only an owned note within the exact path binding. */
    @Transactional
    public void deleteNote(UUID workspaceId,UUID conversationId,UUID noteId,ChatActor actor) {
        access.read(actor,workspaceId);
        conversations.requireOwner(actor.userId(),workspaceId,conversationId,true);
        var note=notes.findById(noteId).filter(value -> value.getConversationId().equals(conversationId)
                && value.getWorkspaceId().equals(workspaceId) && value.getUserId().equals(actor.userId()))
                .orElseThrow(() -> new NotFoundError("Ghi chú không tồn tại."));
        notes.delete(note);
    }
    private boolean readable(StudioNote note,ChatSourceSnapshot sources) {
        return note.getSourceMessageId()!=null && sources.fingerprint().equals(note.getSourceFingerprint())
                && messages.sourceMessage(note.getSourceMessageId(),note.getConversationId(),sources);
    }
}
