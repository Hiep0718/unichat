package com.unichat.core.chat.domain;

import java.util.List;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;

/**
 * Repository interface for Message entity.
 */
public interface MessageRepository extends JpaRepository<Message, UUID> {

    /**
     * Finds messages by conversation ID ordered by creation time.
     */
    List<Message> findByConversationIdOrderByCreatedAtAsc(UUID conversationId);

    /**
     * Loads the most recent messages for a conversation (DESC order).
     *
     * <p>Used by {@code ConversationHistoryBuilder} to load last N messages efficiently
     * without loading entire conversation history into memory.</p>
     */
    List<Message> findTop20ByConversationIdOrderByCreatedAtDesc(UUID conversationId);
}
