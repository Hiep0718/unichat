package com.unichat.core.workchat.service;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNull;
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
import java.util.UUID;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import com.unichat.core.user.domain.User;
import com.unichat.core.user.domain.UserRepository;
import com.unichat.core.workchat.api.ConversationSummary;
import com.unichat.core.workchat.api.ParticipantSummary;
import com.unichat.core.workchat.domain.ConversationKind;
import com.unichat.core.workchat.domain.ConversationParticipant;
import com.unichat.core.workchat.domain.ConversationParticipantRepository;
import com.unichat.core.workchat.domain.DirectConversation;
import com.unichat.core.workchat.domain.DirectMessage;
import com.unichat.core.workchat.domain.DirectMessageRepository;
import com.unichat.core.workchat.domain.ParticipantRole;

/**
 * A row in the conversation list reads the same whichever kind it is: a title,
 * who is in it, a preview and an unread count.
 */
class ConversationSummaryAssemblerTest {

    private ConversationParticipantRepository participantRepository;
    private DirectMessageRepository messageRepository;
    private ConversationSummaryAssembler assembler;

    private final Clock clock = Clock.fixed(Instant.parse("2026-10-09T09:00:00Z"), ZoneOffset.UTC);
    private final UUID alice = UUID.fromString("11111111-1111-1111-1111-111111111111");
    private final UUID bob = UUID.fromString("22222222-2222-2222-2222-222222222222");
    private final UUID conversationId = UUID.randomUUID();

    @BeforeEach
    void setUp() {
        participantRepository = mock(ConversationParticipantRepository.class);
        messageRepository = mock(DirectMessageRepository.class);
        UserRepository userRepository = mock(UserRepository.class);

        // Built before the stubbing below: creating a mock inside a when(...)
        // argument leaves the outer stubbing unfinished.
        List<User> users = List.of(user(alice, "Hùng"), user(bob, "Minh Anh"));
        when(userRepository.findAllById(anyList())).thenReturn(users);
        when(participantRepository.findByIdConversationIdIn(anyList()))
                .thenReturn(List.of(
                        participant(alice, ParticipantRole.OWNER),
                        participant(bob, ParticipantRole.MEMBER)));

        assembler = new ConversationSummaryAssembler(
                participantRepository, messageRepository, userRepository);
    }

    @Test
    void shouldNameAOneToOneRowAfterTheOtherPerson() {
        // Act
        ConversationSummary row = assembler.assembleOne(pair(), alice);

        // Assert: Alice sees Minh Anh, not herself.
        assertEquals("Minh Anh", row.title());
        assertEquals(bob, row.otherUserId());
        assertEquals(ConversationKind.DIRECT, row.kind());
    }

    @Test
    void shouldNameAGroupRowAfterItsTitleAndLeaveNoOtherPerson() {
        // Act
        ConversationSummary row = assembler.assembleOne(group(), alice);

        // Assert: a group has no single other person to point at.
        assertEquals("Nhóm đồ án", row.title());
        assertNull(row.otherUserId());
        assertEquals(ConversationKind.GROUP, row.kind());
    }

    @Test
    void shouldListEveryoneInTheRowAndMarkTheCaller() {
        // Act
        ConversationSummary row = assembler.assembleOne(group(), alice);

        // Assert
        assertEquals(2, row.participants().size());
        ParticipantSummary me = row.participants().stream()
                .filter(ParticipantSummary::me).findFirst().orElseThrow();
        assertEquals(alice, me.userId());
        assertEquals(ParticipantRole.OWNER, me.role());
        assertFalse(row.participants().get(1).me());
    }

    @Test
    void shouldLeaveThePreviewEmptyInAThreadNobodyHasWrittenIn() {
        // Act
        ConversationSummary row = assembler.assembleOne(pair(), alice);

        // Assert
        assertNull(row.lastMessage());
        assertEquals(0L, row.unreadCount());
    }

    @Test
    void shouldPreviewAFileOnlyMessageWithoutReadingItsText() {
        // Arrange: a message may carry no text at all.
        when(messageRepository.findLatestPerConversation(anyList()))
                .thenReturn(List.of(message(null)));

        // Act
        ConversationSummary row = assembler.assembleOne(pair(), alice);

        // Assert
        assertEquals("Đã gửi tệp đính kèm", row.lastMessage());
    }

    @Test
    void shouldShortenALongMessageIntoAPreview() {
        // Arrange
        String longBody = "x".repeat(300);
        when(messageRepository.findLatestPerConversation(anyList()))
                .thenReturn(List.of(message(longBody)));

        // Act
        ConversationSummary row = assembler.assembleOne(pair(), alice);

        // Assert: enough to recognise the thread, not to read it.
        assertTrue(row.lastMessage().endsWith("…"));
        assertTrue(row.lastMessage().length() < longBody.length());
    }

    @Test
    void shouldCountUnreadMessagesPerConversation() {
        // Arrange: the count comes from one query for the whole page.
        when(messageRepository.findLatestPerConversation(anyList()))
                .thenReturn(List.of(message("tin mới")));
        when(messageRepository.countUnreadByConversation(anyList(), any()))
                .thenReturn(List.<Object[]>of(new Object[] { conversationId, 3L }));

        // Act
        ConversationSummary row = assembler.assembleOne(pair(), alice);

        // Assert
        assertEquals(3L, row.unreadCount());
        assertEquals("tin mới", row.lastMessage());
    }

    @Test
    void shouldNotQueryAtAllForAnEmptyPage() {
        // Act
        List<ConversationSummary> rows = assembler.assemble(List.of(), alice);

        // Assert
        assertTrue(rows.isEmpty());
        verify(participantRepository, never()).findByIdConversationIdIn(anyList());
    }

    private DirectConversation pair() {
        return DirectConversation.between(conversationId, alice, bob, Instant.now(clock));
    }

    private DirectConversation group() {
        return DirectConversation.group(
                conversationId, "Nhóm đồ án", alice, Instant.now(clock));
    }

    private DirectMessage message(String body) {
        return new DirectMessage(
                UUID.randomUUID(), conversationId, bob, body, Instant.now(clock));
    }

    private ConversationParticipant participant(UUID userId, ParticipantRole role) {
        return new ConversationParticipant(conversationId, userId, role, Instant.now(clock));
    }

    private User user(UUID id, String displayName) {
        User user = mock(User.class);
        when(user.getId()).thenReturn(id);
        when(user.getDisplayName()).thenReturn(displayName);
        return user;
    }
}
