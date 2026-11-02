package com.unichat.core.workchat.domain;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface ConversationParticipantRepository
        extends JpaRepository<ConversationParticipant, ConversationParticipantId> {

    /** One person's membership of one conversation, which is what grants access. */
    Optional<ConversationParticipant> findByIdConversationIdAndIdUserId(UUID conversationId,
                                                                        UUID userId);

    /** Everyone in a conversation, in the order they joined. */
    List<ConversationParticipant> findByIdConversationIdOrderByJoinedAtAsc(UUID conversationId);

    /** Members of a page of conversations, for the avatars in the list. */
    List<ConversationParticipant> findByIdConversationIdIn(List<UUID> conversationIds);

    long countByIdConversationId(UUID conversationId);
}
