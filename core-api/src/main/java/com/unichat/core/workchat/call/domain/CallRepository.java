package com.unichat.core.workchat.call.domain;

import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

/** Stored calls, read for history and for the "already on a call" check. */
public interface CallRepository extends JpaRepository<Call, UUID> {

    /**
     * Whether this person is on a call right now, as caller or callee.
     *
     * <p>Asked before every new call so a second one cannot start while the
     * first is still up. Both directions matter: being rung by someone else
     * occupies the line exactly as much as ringing them.
     */
    @Query("""
            SELECT COUNT(c) > 0 FROM Call c
            WHERE (c.callerId = :userId OR c.calleeId = :userId)
              AND c.status IN (com.unichat.core.workchat.call.domain.CallStatus.RINGING,
                               com.unichat.core.workchat.call.domain.CallStatus.ACTIVE)
            """)
    boolean hasLiveCall(@Param("userId") UUID userId);

    /**
     * Calls that have been ringing since before the given moment.
     *
     * <p>Drives the sweep that gives up on a call nobody answered. Without it
     * a row stays {@code RINGING} forever when the caller closes the tab, and
     * both parties are then held off making any further call.
     */
    @Query("""
            SELECT c FROM Call c
            WHERE c.status = com.unichat.core.workchat.call.domain.CallStatus.RINGING
              AND c.startedAt < :cutoff
            """)
    List<Call> findRingingSince(@Param("cutoff") Instant cutoff);

    /** One conversation's calls, newest first. */
    Page<Call> findByConversationIdOrderByStartedAtDesc(UUID conversationId, Pageable pageable);

    /** The live call between these two, if there is one. */
    @Query("""
            SELECT c FROM Call c
            WHERE c.conversationId = :conversationId
              AND c.status IN (com.unichat.core.workchat.call.domain.CallStatus.RINGING,
                               com.unichat.core.workchat.call.domain.CallStatus.ACTIVE)
            """)
    Optional<Call> findLiveInConversation(@Param("conversationId") UUID conversationId);
}
