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
     * Messages in this conversation that the caller has not read.
     *
     * <p>Excludes the caller's own messages: reading your own is meaningless,
     * and counting them would show an unread badge on every thread you speak in.
     */
    @Query("SELECT m FROM DirectMessage m WHERE m.conversationId = :conversationId "
            + "AND m.senderId <> :readerId AND m.readAt IS NULL")
    List<DirectMessage> findUnreadFor(@Param("conversationId") UUID conversationId,
                                      @Param("readerId") UUID readerId);

    /** Unread counts for a page of conversations, in one query rather than per row. */
    @Query("SELECT m.conversationId, COUNT(m) FROM DirectMessage m "
            + "WHERE m.conversationId IN :conversationIds "
            + "AND m.senderId <> :readerId AND m.readAt IS NULL "
            + "GROUP BY m.conversationId")
    List<Object[]> countUnreadByConversation(@Param("conversationIds") List<UUID> conversationIds,
                                             @Param("readerId") UUID readerId);

    /** Newest message per conversation, for the preview line in the list. */
    @Query("SELECT m FROM DirectMessage m WHERE m.conversationId IN :conversationIds "
            + "AND m.createdAt = (SELECT MAX(x.createdAt) FROM DirectMessage x "
            + "WHERE x.conversationId = m.conversationId)")
    List<DirectMessage> findLatestPerConversation(@Param("conversationIds") List<UUID> conversationIds);
}
