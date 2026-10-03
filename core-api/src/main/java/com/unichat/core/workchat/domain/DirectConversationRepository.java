package com.unichat.core.workchat.domain;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

@Repository
public interface DirectConversationRepository extends JpaRepository<DirectConversation, UUID> {

    /**
     * Finds the conversation between two people.
     *
     * <p>Callers pass the pair already ordered, the same way
     * {@link DirectConversation#between} orders it, so the lookup finds the row
     * regardless of who is asking.
     */
    Optional<DirectConversation> findByParticipantLowAndParticipantHigh(UUID low, UUID high);

    /**
     * Conversations this person is part of, most recently active first.
     *
     * <p>A conversation with no messages yet sorts by when it was opened, so a
     * thread someone just started does not vanish to the bottom of the list.
     */
    @Query("SELECT c FROM DirectConversation c "
            + "WHERE c.participantLow = :userId OR c.participantHigh = :userId "
            + "ORDER BY COALESCE(c.lastMessageAt, c.createdAt) DESC")
    Page<DirectConversation> findForParticipant(@Param("userId") UUID userId, Pageable pageable);

    /** Used to resolve display names for a page of conversations in one query. */
    @Query("SELECT c FROM DirectConversation c WHERE c.id IN :ids")
    List<DirectConversation> findAllByIdIn(@Param("ids") List<UUID> ids);
}
