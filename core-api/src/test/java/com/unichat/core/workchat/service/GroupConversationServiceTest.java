package com.unichat.core.workchat.service;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;

import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.time.Clock;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.context.ApplicationEventPublisher;

import com.unichat.core.common.error.AuthorizationError;
import com.unichat.core.common.error.ConflictError;
import com.unichat.core.common.error.NotFoundError;
import com.unichat.core.common.error.ValidationError;
import com.unichat.core.workchat.domain.ConversationListChangedEvent;
import com.unichat.core.workchat.domain.ConversationParticipant;
import com.unichat.core.workchat.domain.ConversationParticipantRepository;
import com.unichat.core.workchat.domain.DirectConversation;
import com.unichat.core.workchat.domain.DirectConversationRepository;
import com.unichat.core.workchat.domain.ParticipantRole;

/**
 * A group cannot become a way around the rule that strangers cannot reach you,
 * only its owner changes who is in it, and it is never left unadministered.
 */
class GroupConversationServiceTest {

    private DirectConversationRepository conversationRepository;
    private ConversationParticipantRepository participantRepository;
    private ContactDirectory contactDirectory;
    private ApplicationEventPublisher eventPublisher;
    private GroupConversationService service;

    private final Clock clock = Clock.fixed(Instant.parse("2026-10-09T09:00:00Z"), ZoneOffset.UTC);
    private final UUID alice = UUID.fromString("11111111-1111-1111-1111-111111111111");
    private final UUID bob = UUID.fromString("22222222-2222-2222-2222-222222222222");
    private final UUID carol = UUID.fromString("33333333-3333-3333-3333-333333333333");
    private final UUID stranger = UUID.fromString("44444444-4444-4444-4444-444444444444");
    private final UUID conversationId = UUID.randomUUID();

    @BeforeEach
    void setUp() {
        conversationRepository = mock(DirectConversationRepository.class);
        participantRepository = mock(ConversationParticipantRepository.class);
        contactDirectory = mock(ContactDirectory.class);
        eventPublisher = mock(ApplicationEventPublisher.class);

        when(contactDirectory.canMessage(any(), any())).thenReturn(true);
        when(conversationRepository.save(any(DirectConversation.class)))
                .thenAnswer(invocation -> invocation.getArgument(0));
        when(participantRepository.save(any(ConversationParticipant.class)))
                .thenAnswer(invocation -> invocation.getArgument(0));

        service = new GroupConversationService(
                conversationRepository,
                participantRepository,
                new ConversationAccess(conversationRepository, participantRepository),
                mock(ConversationSummaryAssembler.class),
                contactDirectory,
                eventPublisher,
                clock);
    }

    @Test
    void shouldMakeTheCreatorTheOwnerAndEveryoneElseAMember() {
        // Act
        service.create(alice, "Nhóm đồ án", List.of(bob, carol));

        // Assert
        ArgumentCaptor<ConversationParticipant> rows =
                ArgumentCaptor.forClass(ConversationParticipant.class);
        verify(participantRepository, org.mockito.Mockito.times(3)).save(rows.capture());
        ConversationParticipant creator = rows.getAllValues().get(0);
        assertEquals(alice, creator.getUserId());
        assertTrue(creator.isOwner());
        assertTrue(rows.getAllValues().subList(1, 3).stream().noneMatch(ConversationParticipant::isOwner));
    }

    @Test
    void shouldRefuseAMemberWhoSharesNoGroupWithTheCreator() {
        // Arrange: a group must not become a way to reach someone who could not
        // be messaged one-to-one.
        when(contactDirectory.canMessage(alice, stranger)).thenReturn(false);

        // Act and Assert
        assertThrows(AuthorizationError.class,
                () -> service.create(alice, "Nhóm lạ", List.of(bob, stranger)));
        verify(conversationRepository, never()).save(any());
    }

    @Test
    void shouldIgnoreDuplicatesAndTheCreatorInTheMemberList() {
        // Act: a client sending the obvious thing should not get an error.
        service.create(alice, "Nhóm đồ án", List.of(bob, bob, alice));

        // Assert: Alice once as owner, Bob once as member.
        verify(participantRepository, org.mockito.Mockito.times(2))
                .save(any(ConversationParticipant.class));
    }

    @Test
    void shouldRefuseAGroupWithNobodyElseInIt() {
        // Act and Assert
        assertThrows(ValidationError.class,
                () -> service.create(alice, "Một mình", List.of(alice)));
        verify(conversationRepository, never()).save(any());
    }

    @Test
    void shouldRefuseMorePeopleThanAGroupHoldsAtCreation() {
        // Arrange
        List<UUID> crowd = java.util.stream.Stream
                .generate(UUID::randomUUID)
                .limit(GroupConversationService.MAX_PARTICIPANTS)
                .toList();

        // Act and Assert
        assertThrows(ValidationError.class, () -> service.create(alice, "Hội trường", crowd));
        verify(conversationRepository, never()).save(any());
    }

    @Test
    void shouldLetOnlyTheOwnerAddSomeone() {
        // Arrange
        groupWith(bob, ParticipantRole.MEMBER);

        // Act and Assert
        assertThrows(AuthorizationError.class,
                () -> service.addMember(bob, conversationId, carol));
        verify(participantRepository, never()).save(any());
    }

    @Test
    void shouldRefuseAddingSomeoneAlreadyInTheGroup() {
        // Arrange
        groupWith(alice, ParticipantRole.OWNER);
        when(participantRepository.findByIdConversationIdAndIdUserId(conversationId, bob))
                .thenReturn(Optional.of(participant(bob, ParticipantRole.MEMBER, 1)));

        // Act and Assert
        assertThrows(ConflictError.class, () -> service.addMember(alice, conversationId, bob));
    }

    @Test
    void shouldRefuseAddingSomeoneTheOwnerCannotMessage() {
        // Arrange
        groupWith(alice, ParticipantRole.OWNER);
        when(contactDirectory.canMessage(alice, stranger)).thenReturn(false);

        // Act and Assert
        assertThrows(AuthorizationError.class,
                () -> service.addMember(alice, conversationId, stranger));
    }

    @Test
    void shouldTellTheOwnerToLeaveRatherThanRemoveThemselves() {
        // Arrange: removing yourself would skip handing the group on.
        groupWith(alice, ParticipantRole.OWNER);

        // Act and Assert
        assertThrows(ValidationError.class,
                () -> service.removeMember(alice, conversationId, alice));
        verify(participantRepository, never()).delete(any());
    }

    @Test
    void shouldTellTheRemovedPersonSoTheGroupLeavesTheirListAtOnce() {
        // Arrange
        groupWith(alice, ParticipantRole.OWNER);
        when(participantRepository.findByIdConversationIdAndIdUserId(conversationId, bob))
                .thenReturn(Optional.of(participant(bob, ParticipantRole.MEMBER, 1)));
        when(participantRepository.findByIdConversationIdOrderByJoinedAtAsc(conversationId))
                .thenReturn(List.of(participant(alice, ParticipantRole.OWNER, 0),
                        participant(carol, ParticipantRole.MEMBER, 2)));

        // Act
        service.removeMember(alice, conversationId, bob);

        // Assert
        assertTrue(announcedTo().contains(bob));
        assertTrue(announcedTo().contains(carol));
    }

    @Test
    void shouldHandTheGroupToTheEarliestJoinerWhenItsOwnerLeaves() {
        // Arrange: a group must never be left with nobody able to administer it.
        groupWith(alice, ParticipantRole.OWNER);
        ConversationParticipant earliest = participant(bob, ParticipantRole.MEMBER, 1);
        when(participantRepository.findByIdConversationIdOrderByJoinedAtAsc(conversationId))
                .thenReturn(List.of(
                        participant(alice, ParticipantRole.OWNER, 0),
                        earliest,
                        participant(carol, ParticipantRole.MEMBER, 2)));

        // Act
        service.leave(alice, conversationId);

        // Assert
        assertTrue(earliest.isOwner());
        verify(participantRepository).save(earliest);
    }

    @Test
    void shouldLetTheLastPersonLeaveWithoutHandingTheGroupToAnyone() {
        // Arrange
        groupWith(alice, ParticipantRole.OWNER);
        when(participantRepository.findByIdConversationIdOrderByJoinedAtAsc(conversationId))
                .thenReturn(List.of(participant(alice, ParticipantRole.OWNER, 0)));

        // Act: the messages stay behind; the conversation simply stops being listed.
        service.leave(alice, conversationId);

        // Assert
        verify(participantRepository).delete(any(ConversationParticipant.class));
        verify(participantRepository, never()).save(any());
    }

    @Test
    void shouldRefuseLeavingAOneToOneConversation() {
        // Arrange: there is nothing to leave when the membership is the pair.
        when(conversationRepository.findById(conversationId)).thenReturn(
                Optional.of(DirectConversation.between(conversationId, alice, bob, now())));
        when(participantRepository.findByIdConversationIdAndIdUserId(conversationId, alice))
                .thenReturn(Optional.of(participant(alice, ParticipantRole.MEMBER, 0)));

        // Act and Assert
        assertThrows(ValidationError.class, () -> service.leave(alice, conversationId));
        verify(participantRepository, never()).delete(any());
    }

    @Test
    void shouldHideTheMemberListFromSomeoneOutsideTheConversation() {
        // Arrange
        groupWith(alice, ParticipantRole.OWNER);

        // Act and Assert
        assertThrows(NotFoundError.class,
                () -> service.listParticipants(stranger, conversationId));
    }

    @Test
    void shouldRefuseRenamingByAnyoneButTheOwner() {
        // Arrange
        groupWith(bob, ParticipantRole.MEMBER);

        // Act and Assert
        assertThrows(AuthorizationError.class,
                () -> service.rename(bob, conversationId, "Tên mới"));
        verify(conversationRepository, never()).save(any());
    }

    /* ---------- Helpers ---------- */

    private List<UUID> announcedTo() {
        ArgumentCaptor<ConversationListChangedEvent> event =
                ArgumentCaptor.forClass(ConversationListChangedEvent.class);
        verify(eventPublisher, org.mockito.Mockito.atLeastOnce()).publishEvent(event.capture());
        return event.getAllValues().stream()
                .flatMap(published -> published.recipientIds().stream())
                .toList();
    }

    private void groupWith(UUID userId, ParticipantRole role) {
        when(conversationRepository.findById(conversationId)).thenReturn(Optional.of(
                DirectConversation.group(conversationId, "Nhóm đồ án", alice, now())));
        when(participantRepository.findByIdConversationIdAndIdUserId(conversationId, userId))
                .thenReturn(Optional.of(participant(userId, role, 0)));
    }

    private ConversationParticipant participant(UUID userId, ParticipantRole role, int joinedOrder) {
        return new ConversationParticipant(
                conversationId, userId, role, now().plusSeconds(joinedOrder));
    }

    private Instant now() {
        return Instant.now(clock);
    }
}
