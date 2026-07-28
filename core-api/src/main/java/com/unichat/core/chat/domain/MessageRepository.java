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
}
