package com.unichat.core.workchat.service;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import java.time.Instant;
import java.util.Optional;
import java.util.UUID;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import com.unichat.core.common.error.NotFoundError;
import com.unichat.core.workchat.domain.DirectConversation;
import com.unichat.core.workchat.domain.DirectConversationRepository;

/**
 * A conversation id is guessable, so holding one grants nothing on its own.
 */
class ConversationAccessTest {

    private DirectConversationRepository conversationRepository;
    private ConversationAccess access;

    private final Instant createdAt = Instant.parse("2026-10-09T09:00:00Z");
    private final UUID alice = UUID.fromString("11111111-1111-1111-1111-111111111111");
    private final UUID bob = UUID.fromString("22222222-2222-2222-2222-222222222222");
    private final UUID stranger = UUID.fromString("33333333-3333-3333-3333-333333333333");
    private final UUID conversationId = UUID.randomUUID();

    @BeforeEach
    void setUp() {
        conversationRepository = mock(DirectConversationRepository.class);
        access = new ConversationAccess(conversationRepository);
    }

    @Test
    void shouldReturnTheConversationToAParticipant() {
        // Arrange
        when(conversationRepository.findById(conversationId))
                .thenReturn(Optional.of(conversation()));

        // Act
        DirectConversation found = access.requireParticipant(alice, conversationId);

        // Assert
        assertEquals(conversationId, found.getId());
    }

    @Test
    void shouldGiveAStrangerTheSameAnswerAsAMissingConversation() {
        // Arrange: telling the two cases apart would confirm to a stranger that
        // a conversation with that id exists.
        when(conversationRepository.findById(conversationId))
                .thenReturn(Optional.of(conversation()));
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

    private DirectConversation conversation() {
        return DirectConversation.between(conversationId, alice, bob, createdAt);
    }
}
