package com.unichat.core.workchat.domain;

import java.util.List;
import java.util.UUID;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

@Repository
public interface DirectMessageRepository extends JpaRepository<DirectMessage, UUID> {

    /** One conversation's messages, newest first so paging reaches history. */
    Page<DirectMessage> findByConversationIdOrderByCreatedAtDesc(UUID conversationId, Pageable pageable);

    /**
     * Unread counts for a page of conversations, in one query rather than per row.
     *
     * <p>Compares each message against the reader's own watermark, which is why
     * this is native: the watermark lives on a different table and JPQL cannot
     * join to it without an association that would exist only for this query.
     *
     * <p>Excludes the reader's own messages: reading your own is meaningless,
     * and counting them would put an unread badge on every thread you speak in.
     */
    @Query(value = "SELECT m.conversation_id, COUNT(*) FROM direct_messages m "
            + "JOIN conversation_participants p "
            + "  ON p.conversation_id = m.conversation_id AND p.user_id = :readerId "
            + "WHERE m.conversation_id IN :conversationIds "
            + "  AND m.sender_id <> :readerId "
            + "  AND (p.last_read_at IS NULL OR m.created_at > p.last_read_at) "
            + "GROUP BY m.conversation_id", nativeQuery = true)
    List<Object[]> countUnreadByConversation(@Param("conversationIds") List<UUID> conversationIds,
                                             @Param("readerId") UUID readerId);

    /** Newest message per conversation, for the preview line in the list. */
    @Query("SELECT m FROM DirectMessage m WHERE m.conversationId IN :conversationIds "
            + "AND m.createdAt = (SELECT MAX(x.createdAt) FROM DirectMessage x "
            + "WHERE x.conversationId = m.conversationId)")
    List<DirectMessage> findLatestPerConversation(@Param("conversationIds") List<UUID> conversationIds);
}
