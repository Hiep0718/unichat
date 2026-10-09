package com.unichat.core.workchat.service;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import com.unichat.core.common.error.NotFoundError;
import com.unichat.core.workchat.domain.ConversationParticipant;
import com.unichat.core.workchat.domain.ConversationParticipantRepository;
import com.unichat.core.workchat.domain.DirectConversation;
import com.unichat.core.workchat.domain.DirectConversationRepository;
import com.unichat.core.workchat.domain.ParticipantRole;

/**
 * A conversation id is guessable, so holding one grants nothing on its own.
 * Participation is read from the participant rows for both kinds alike.
 */
class ConversationAccessTest {

    private DirectConversationRepository conversationRepository;
    private ConversationParticipantRepository participantRepository;
    private ConversationAccess access;

    private final Instant createdAt = Instant.parse("2026-10-09T09:00:00Z");
    private final UUID alice = UUID.fromString("11111111-1111-1111-1111-111111111111");
    private final UUID bob = UUID.fromString("22222222-2222-2222-2222-222222222222");
    private final UUID stranger = UUID.fromString("33333333-3333-3333-3333-333333333333");
    private final UUID conversationId = UUID.randomUUID();

    @BeforeEach
    void setUp() {
        conversationRepository = mock(DirectConversationRepository.class);
        participantRepository = mock(ConversationParticipantRepository.class);
        access = new ConversationAccess(conversationRepository, participantRepository);

        when(conversationRepository.findById(conversationId))
                .thenReturn(Optional.of(DirectConversation.between(
                        conversationId, alice, bob, createdAt)));
        when(participantRepository.findByIdConversationIdAndIdUserId(any(), any()))
                .thenReturn(Optional.empty());
    }

    @Test
    void shouldReturnTheConversationToAParticipant() {
        // Arrange
        when(participantRepository.findByIdConversationIdAndIdUserId(conversationId, alice))
                .thenReturn(Optional.of(participant(alice, ParticipantRole.MEMBER)));

        // Act
        DirectConversation found = access.requireParticipant(alice, conversationId);

        // Assert
        assertEquals(conversationId, found.getId());
    }

    @Test
    void shouldGiveSomeoneOutsideTheConversationTheSameAnswerAsAMissingOne() {
        // Arrange: telling the two cases apart would confirm to a stranger that
        // a conversation with that id exists.
        when(participantRepository.findByIdConversationIdAndIdUserId(conversationId, alice))
                .thenReturn(Optional.of(participant(alice, ParticipantRole.MEMBER)));
        UUID unknownId = UUID.randomUUID();
        when(conversationRepository.findById(unknownId)).thenReturn(Optional.empty());

        // Act
        NotFoundError forStranger = assertThrows(NotFoundError.class,
                () -> access.requireParticipant(stranger, conversationId));
        NotFoundError forMissing = assertThrows(NotFoundError.class,
                () -> access.requireParticipant(alice, unknownId));

        // Assert
        assertEquals(forMissing.getMessage(), forStranger.getMessage());
    }

    @Test
    void shouldReturnTheCallersOwnMembershipAlongsideTheConversation() {
        // Arrange: group administration needs the role, and loading it
        // separately would check participation twice.
        when(participantRepository.findByIdConversationIdAndIdUserId(conversationId, alice))
                .thenReturn(Optional.of(participant(alice, ParticipantRole.OWNER)));

        // Act
        ConversationAccess.Participation participation =
                access.participationOf(alice, conversationId);

        // Assert
        assertTrue(participation.participant().isOwner());
        assertEquals(conversationId, participation.conversation().getId());
    }

    @Test
    void shouldNameEveryoneButTheSenderAsARecipient() {
        // Arrange: the sender's own client already has the message from the
        // request it made, so pushing it back would duplicate the bubble.
        when(participantRepository.findByIdConversationIdOrderByJoinedAtAsc(conversationId))
                .thenReturn(List.of(
                        participant(alice, ParticipantRole.OWNER),
                        participant(bob, ParticipantRole.MEMBER),
                        participant(stranger, ParticipantRole.MEMBER)));

        // Act
        Set<UUID> recipients = access.recipientsOf(conversationId, alice);

        // Assert
        assertEquals(Set.of(bob, stranger), recipients);
    }

    private ConversationParticipant participant(UUID userId, ParticipantRole role) {
        return new ConversationParticipant(conversationId, userId, role, createdAt);
    }
}
