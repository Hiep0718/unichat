package com.unichat.core.workchat.service;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyList;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.doThrow;
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
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.web.multipart.MultipartFile;

import com.unichat.core.common.error.FileRejectedError;
import com.unichat.core.common.error.ValidationError;
import com.unichat.core.user.domain.User;
import com.unichat.core.user.domain.UserRepository;
import com.unichat.core.workchat.api.ChatAttachmentResponse;
import com.unichat.core.workchat.api.ConversationSummary;
import com.unichat.core.workchat.api.MessageResponse;
import com.unichat.core.workchat.domain.ChatAttachmentKind;
import com.unichat.core.workchat.domain.DirectConversation;
import com.unichat.core.workchat.domain.DirectConversationRepository;
import com.unichat.core.workchat.domain.DirectMessage;
import com.unichat.core.workchat.domain.DirectMessageRepository;

/**
 * A message may be text, files, or both — but never neither, and never a bubble
 * whose files failed to store, because delivery cannot be taken back.
 */
class DirectMessageAttachmentTest {

    private DirectConversationRepository conversationRepository;
    private DirectMessageRepository messageRepository;
    private ChatAttachmentService attachmentService;
    private DirectMessageService service;

    private final Clock clock = Clock.fixed(Instant.parse("2026-10-09T09:00:00Z"), ZoneOffset.UTC);
    private final UUID alice = UUID.fromString("11111111-1111-1111-1111-111111111111");
    private final UUID bob = UUID.fromString("22222222-2222-2222-2222-222222222222");
    private final UUID conversationId = UUID.randomUUID();

    @BeforeEach
    void setUp() {
        conversationRepository = mock(DirectConversationRepository.class);
        messageRepository = mock(DirectMessageRepository.class);
        attachmentService = mock(ChatAttachmentService.class);
        UserRepository userRepository = mock(UserRepository.class);

        User sender = mock(User.class);
        when(sender.getDisplayName()).thenReturn("alice");
        when(userRepository.findById(any())).thenReturn(Optional.of(sender));

        service = new DirectMessageService(
                conversationRepository,
                messageRepository,
                mock(ContactDirectory.class),
                new ConversationAccess(conversationRepository),
                attachmentService,
                userRepository,
                mock(ApplicationEventPublisher.class),
                clock);
    }

    @Test
    void shouldRefuseAMessageWithNeitherTextNorFile() {
        // Arrange
        openConversation();

        // Act and Assert
        assertThrows(ValidationError.class, () -> service.send(alice, conversationId, "   "));
        verify(messageRepository, never()).save(any());
    }

    @Test
    void shouldSendAMessageThatCarriesOnlyFiles() {
        // Arrange
        openConversation();
        when(attachmentService.attachAll(any(), any(), anyList())).thenReturn(List.of(
                new ChatAttachmentResponse(UUID.randomUUID(), ChatAttachmentKind.IMAGE,
                        "anh.png", "image/png", 2L)));

        // Act
        MessageResponse sent = service.send(alice, conversationId, null, List.of(image()));

        // Assert: no text at all, rather than an empty string standing in for it.
        assertNull(sent.body());
        assertEquals(1, sent.attachments().size());
        assertNull(storedMessage().getBody());
    }

    @Test
    void shouldNotStoreAMessageWhenItsFilesAreRejected() {
        // Arrange: a rejected file must leave no bubble behind, because a
        // delivered bubble cannot be withdrawn.
        openConversation();
        doThrow(new FileRejectedError("Tệp quá lớn")).when(attachmentService).validateAll(anyList());

        // Act and Assert
        assertThrows(FileRejectedError.class,
                () -> service.send(alice, conversationId, "xem tệp này", List.of(image())));
        verify(messageRepository, never()).save(any());
    }

    @Test
    void shouldRefuseABodyBeyondTheLengthLimit() {
        // Arrange: the multipart path carries no bean validation, so the limit
        // has to hold in the service as well as on the JSON request.
        openConversation();

        // Act and Assert
        assertThrows(ValidationError.class,
                () -> service.send(alice, conversationId, "x".repeat(4001)));
        verify(messageRepository, never()).save(any());
    }

    @Test
    void shouldAttachFilesToTheMessageItJustStored() {
        // Arrange
        openConversation();

        // Act
        service.send(alice, conversationId, "kèm ảnh", List.of(image()));

        // Assert: the files hang off this message, not off the conversation.
        // The id is read first, because a verify nested inside another one
        // leaves Mockito with an unfinished verification.
        UUID stored = storedMessage().getId();
        verify(attachmentService).attachAll(eq(conversationId), eq(stored), anyList());
    }

    @Test
    void shouldPreviewAFileOnlyMessageWithoutReadingItsText() {
        // Arrange
        when(conversationRepository.findForParticipant(any(), any(Pageable.class)))
                .thenReturn(new PageImpl<>(List.of(conversation())));
        when(messageRepository.findLatestPerConversation(anyList())).thenReturn(List.of(
                new DirectMessage(UUID.randomUUID(), conversationId, bob, null, Instant.now(clock))));
        when(messageRepository.countUnreadByConversation(anyList(), any())).thenReturn(List.of());

        // Act
        List<ConversationSummary> rows = service.listConversations(alice, 0, 20);

        // Assert
        assertEquals("Đã gửi tệp đính kèm", rows.get(0).lastMessage());
    }

    private void openConversation() {
        when(conversationRepository.findById(conversationId))
                .thenReturn(Optional.of(conversation()));
    }

    private DirectMessage storedMessage() {
        ArgumentCaptor<DirectMessage> captor = ArgumentCaptor.forClass(DirectMessage.class);
        verify(messageRepository).save(captor.capture());
        return captor.getValue();
    }

    private DirectConversation conversation() {
        return DirectConversation.between(conversationId, alice, bob, Instant.now(clock));
    }

    private MultipartFile image() {
        return new MockMultipartFile("files", "anh.png", "image/png", new byte[] { 1, 2 });
    }
}
