package com.unichat.core.chat.service;

import java.time.Clock;
import java.util.UUID;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import com.unichat.core.chat.api.*;
import com.unichat.core.chat.domain.Conversation;
import com.unichat.core.chat.domain.ConversationRepository;
import com.unichat.core.common.error.NotFoundError;

/** Owns private conversation metadata and bounded source-safe message history. */
@Service
public class ConversationService {
    private final ConversationRepository conversations;
    private final ChatConversationStore ownership;
    private final ChatAccessService access;
    private final ChatMessageStore messages;
    private final ChatOperationService operations;
    private final JdbcTemplate database;
    private final Clock clock;
    /** Uses Core authorization for every history read and lifecycle mutation. */
    public ConversationService(ConversationRepository conversations,ChatConversationStore ownership,
            ChatAccessService access,ChatMessageStore messages,ChatOperationService operations,JdbcTemplate database,Clock clock) {
        this.conversations=conversations;this.ownership=ownership;this.access=access;this.messages=messages;
        this.operations=operations;this.database=database;this.clock=clock;
    }
    /** Lists only the caller's active conversations. */
    @Transactional(readOnly=true)
    public Page<ConversationResponse> getConversations(ChatActor actor,UUID workspaceId,Pageable pageable) {
        access.read(actor,workspaceId);
        return conversations.findByUserIdAndWorkspaceIdAndStatusOrderByUpdatedAtDesc(actor.userId(),workspaceId,"ACTIVE",pageable)
                .map(ConversationResponse::from);
    }
    /** Creates an empty conversation without invoking AI or ingestion. */
    @Transactional
    public ConversationResponse createConversation(ChatActor actor,UUID workspaceId) {
        access.read(actor,workspaceId);
        return ConversationResponse.from(conversations.save(new Conversation(UUID.randomUUID(),workspaceId,actor.userId(),"Hội thoại mới",clock.instant())));
    }
    /** Returns metadata and at most the latest twenty messages. */
    @Transactional(readOnly=true)
    public ConversationDetailResponse getConversation(ChatActor actor,UUID workspaceId,UUID conversationId) {
        var sources=access.read(actor,workspaceId);
        var conversation=owned(actor,workspaceId,conversationId,false);
        return ConversationDetailResponse.from(conversation,messages.page(conversationId,sources,0,20,null).content());
    }
    /** Returns stable message pages anchored by sequence rather than mutable offsets. */
    @Transactional(readOnly=true)
    public MessagePageResponse messages(ChatActor actor,UUID workspaceId,UUID conversationId,int page,int size,Long snapshot) {
        var sources=access.read(actor,workspaceId);
        owned(actor,workspaceId,conversationId,false);
        return messages.page(conversationId,sources,page,size,snapshot);
    }
    /** Deletes metadata and cancels active turns in the same transaction. */
    @Transactional
    public void deleteConversation(ChatActor actor,UUID workspaceId,UUID conversationId) {
        database.queryForObject("SELECT id FROM users WHERE id=? FOR UPDATE",UUID.class,actor.userId());
        access.read(actor,workspaceId);
        var conversation=owned(actor,workspaceId,conversationId,true);
        database.queryForList("SELECT id FROM chat_operations WHERE conversation_id=? AND state='RUNNING'",UUID.class,conversationId)
                .forEach(id -> operations.cancel(actor,workspaceId,id));
        conversation.setStatus("DELETED");conversation.setUpdatedAt(clock.instant());
        conversations.save(conversation);
    }
    private Conversation owned(ChatActor actor,UUID workspaceId,UUID id,boolean lock) {
        ownership.requireOwner(actor.userId(),workspaceId,id,lock);
        return conversations.findByUserIdAndIdAndStatus(actor.userId(),id,"ACTIVE")
                .filter(value -> value.getWorkspaceId().equals(workspaceId)).orElseThrow(() -> new NotFoundError("Hội thoại không tồn tại."));
    }
}
