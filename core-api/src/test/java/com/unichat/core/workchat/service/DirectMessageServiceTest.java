package com.unichat.core.workchat.service;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyList;
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
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;

import com.unichat.core.common.error.AuthorizationError;
import com.unichat.core.common.error.NotFoundError;
import com.unichat.core.user.domain.User;
import com.unichat.core.user.domain.UserRepository;
import com.unichat.core.workchat.api.ConversationSummary;
import com.unichat.core.workchat.api.MessageResponse;
import com.unichat.core.workchat.domain.DirectConversation;
import com.unichat.core.workchat.domain.DirectConversationRepository;
import com.unichat.core.workchat.domain.DirectMessage;
import com.unichat.core.workchat.domain.DirectMessageRepository;

/**
 * Messaging is limited to people who share a group, and every read or write
 * checks that the caller is actually in the conversation.
 */
class DirectMessageServiceTest {

    private DirectConversationRepository conversationRepository;
    private DirectMessageRepository messageRepository;
    private ContactDirectory contactDirectory;
    private UserRepository userRepository;
    private DirectMessageService service;

    private final Clock clock = Clock.fixed(Instant.parse("2026-09-22T09:00:00Z"), ZoneOffset.UTC);
    private final UUID alice = UUID.fromString("11111111-1111-1111-1111-111111111111");
    private final UUID bob = UUID.fromString("22222222-2222-2222-2222-222222222222");
    private final UUID stranger = UUID.fromString("33333333-3333-3333-3333-333333333333");
    private final UUID conversationId = UUID.randomUUID();

    @BeforeEach
    void setUp() {
        conversationRepository = mock(DirectConversationRepository.class);
        messageRepository = mock(DirectMessageRepository.class);
        contactDirectory = mock(ContactDirectory.class);
        userRepository = mock(UserRepository.class);
        service = new DirectMessageService(conversationRepository, messageRepository,
                contactDirectory, userRepository, clock);

        // Built before stubbing the repositories: creating a mock inside a
        // when(...) argument leaves the outer stubbing unfinished.
        User aliceUser = user(alice, "alice@example.com");
        User bobUser = user(bob, "bob@example.com");

        when(contactDirectory.canMessage(alice, bob)).thenReturn(true);
        when(conversationRepository.save(any(DirectConversation.class)))
                .thenAnswer(invocation -> invocation.getArgument(0));
        when(userRepository.findById(any())).thenReturn(Optional.of(bobUser));
        when(userRepository.findAllById(anyList())).thenReturn(List.of(aliceUser, bobUser));
    }

    @Test
    void shouldRefuseToMessageSomeoneWhoSharesNoGroup() {
        // Arrange
        when(contactDirectory.canMessage(alice, stranger)).thenReturn(false);

        // Act and Assert
        assertThrows(AuthorizationError.class, () -> service.openWith(alice, stranger));
        verify(conversationRepository, never()).save(any());
    }

    @Test
    void shouldRefuseAConversationWithOneself() {
        // Act and Assert
        assertThrows(AuthorizationError.class, () -> service.openWith(alice, alice));
    }

    @Test
    void shouldGiveBothPeopleTheSameConversationWhicheverOpensIt() {
        // Arrange: the pair is stored in a fixed order, so the lookup that Bob
        // makes must be the same lookup Alice makes.
        when(contactDirectory.canMessage(bob, alice)).thenReturn(true);
        when(conversationRepository.findByParticipantLowAndParticipantHigh(alice, bob))
                .thenReturn(Optional.empty());

        // Act
        service.openWith(alice, bob);
        service.openWith(bob, alice);

        // Assert: both calls looked the pair up under the same ordered key.
        verify(conversationRepository, org.mockito.Mockito.times(2))
                .findByParticipantLowAndParticipantHigh(alice, bob);
    }

    @Test
    void shouldReuseAnExistingConversationRatherThanOpeningASecond() {
        // Arrange
        when(conversationRepository.findByParticipantLowAndParticipantHigh(alice, bob))
                .thenReturn(Optional.of(conversation()));

        // Act
        ConversationSummary summary = service.openWith(alice, bob);

        // Assert
        assertEquals(conversationId, summary.id());
        verify(conversationRepository, never()).save(any());
    }

    @Test
    void shouldHideAConversationTheCallerIsNotPartOf() {
        // Arrange: a stranger holding a valid id must not learn it exists.
        when(conversationRepository.findById(conversationId))
                .thenReturn(Optional.of(conversation()));

        // Act and Assert
        assertThrows(NotFoundError.class,
                () -> service.listMessages(stranger, conversationId, 0, 20));
    }

    @Test
    void shouldRefuseToSendIntoAConversationTheCallerIsNotPartOf() {
        // Arrange
        when(conversationRepository.findById(conversationId))
                .thenReturn(Optional.of(conversation()));

        // Act and Assert
        assertThrows(NotFoundError.class,
                () -> service.send(stranger, conversationId, "xin chào"));
        verify(messageRepository, never()).save(any());
    }

    @Test
    void shouldMoveTheConversationToTheTopWhenAMessageIsSent() {
        // Arrange
        DirectConversation conversation = conversation();
        when(conversationRepository.findById(conversationId)).thenReturn(Optional.of(conversation));

        // Act
        MessageResponse sent = service.send(alice, conversationId, "  xin chào  ");

        // Assert
        assertEquals(Instant.parse("2026-09-22T09:00:00Z"), conversation.getLastMessageAt());
        assertEquals("xin chào", sent.body());
        assertTrue(sent.mine());
    }

    @Test
    void shouldMarkOnlyTheOtherPersonsMessagesAsRead() {
        // Arrange
        when(conversationRepository.findById(conversationId))
                .thenReturn(Optional.of(conversation()));
        DirectMessage fromBob = new DirectMessage(
                UUID.randomUUID(), conversationId, bob, "chào bạn", Instant.now(clock));
        when(messageRepository.findUnreadFor(conversationId, alice)).thenReturn(List.of(fromBob));

        // Act
        int marked = service.markRead(alice, conversationId);

        // Assert
        assertEquals(1, marked);
        assertNotNull(fromBob.getReadAt());
    }

    @Test
    void shouldKeepTheOriginalTimestampWhenAMessageIsReadTwice() {
        // Arrange
        Instant firstRead = Instant.parse("2026-09-22T08:00:00Z");
        DirectMessage message = new DirectMessage(
                UUID.randomUUID(), conversationId, bob, "chào", Instant.now(clock));
        message.markRead(firstRead);

        // Act
        message.markRead(Instant.parse("2026-09-22T10:00:00Z"));

        // Assert
        assertEquals(firstRead, message.getReadAt());
    }

    @Test
    void shouldShowTheOtherPersonInEachConversationRow() {
        // Arrange
        when(conversationRepository.findForParticipant(any(), any(Pageable.class)))
                .thenReturn(new PageImpl<>(List.of(conversation())));
        when(messageRepository.findLatestPerConversation(anyList())).thenReturn(List.of());
        when(messageRepository.countUnreadByConversation(anyList(), any())).thenReturn(List.of());

        // Act
        List<ConversationSummary> rows = service.listConversations(alice, 0, 20);

        // Assert: Alice sees Bob, not herself.
        assertEquals(1, rows.size());
        assertEquals(bob, rows.get(0).otherUserId());
        assertNull(rows.get(0).lastMessage());
    }

    @Test
    void shouldCountUnreadMessagesPerConversation() {
        // Arrange
        when(conversationRepository.findForParticipant(any(), any(Pageable.class)))
                .thenReturn(new PageImpl<>(List.of(conversation())));
        when(messageRepository.findLatestPerConversation(anyList())).thenReturn(List.of(
                new DirectMessage(UUID.randomUUID(), conversationId, bob, "tin mới", Instant.now(clock))));
        when(messageRepository.countUnreadByConversation(anyList(), any()))
                .thenReturn(List.<Object[]>of(new Object[] { conversationId, 3L }));

        // Act
        List<ConversationSummary> rows = service.listConversations(alice, 0, 20);

        // Assert
        assertEquals(3L, rows.get(0).unreadCount());
        assertEquals("tin mới", rows.get(0).lastMessage());
    }

    @Test
    void shouldShortenALongMessageIntoAPreview() {
        // Arrange
        String longBody = "x".repeat(300);
        when(conversationRepository.findForParticipant(any(), any(Pageable.class)))
                .thenReturn(new PageImpl<>(List.of(conversation())));
        when(messageRepository.findLatestPerConversation(anyList())).thenReturn(List.of(
                new DirectMessage(UUID.randomUUID(), conversationId, bob, longBody, Instant.now(clock))));
        when(messageRepository.countUnreadByConversation(anyList(), any())).thenReturn(List.of());

        // Act
        List<ConversationSummary> rows = service.listConversations(alice, 0, 20);

        // Assert
        assertTrue(rows.get(0).lastMessage().endsWith("…"));
        assertTrue(rows.get(0).lastMessage().length() < longBody.length());
    }

    @Test
    void shouldStoreTheSenderAsTheCallerNotTheRecipient() {
        // Arrange
        when(conversationRepository.findById(conversationId))
                .thenReturn(Optional.of(conversation()));

        // Act
        service.send(alice, conversationId, "xin chào");

        // Assert
        ArgumentCaptor<DirectMessage> captor = ArgumentCaptor.forClass(DirectMessage.class);
        verify(messageRepository).save(captor.capture());
        assertEquals(alice, captor.getValue().getSenderId());
    }

    private DirectConversation conversation() {
        return DirectConversation.between(conversationId, alice, bob, Instant.now(clock));
    }

    private User user(UUID id, String email) {
        User user = mock(User.class);
        when(user.getId()).thenReturn(id);
        when(user.getEmail()).thenReturn(email);
        return user;
    }
}
