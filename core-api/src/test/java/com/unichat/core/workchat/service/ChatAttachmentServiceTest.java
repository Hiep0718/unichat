package com.unichat.core.workchat.service;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.anyString;
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
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.web.multipart.MultipartFile;

import com.unichat.core.common.error.FileRejectedError;
import com.unichat.core.common.error.NotFoundError;
import com.unichat.core.document.storage.StoragePort;
import com.unichat.core.workchat.api.ChatAttachmentResponse;
import com.unichat.core.workchat.domain.ChatAttachment;
import com.unichat.core.workchat.domain.ChatAttachmentKind;
import com.unichat.core.workchat.domain.ChatAttachmentRepository;
import com.unichat.core.workchat.domain.DirectConversation;
import com.unichat.core.workchat.domain.DirectConversationRepository;
import com.unichat.core.workchat.domain.DirectMessage;
import com.unichat.core.workchat.domain.DirectMessageRepository;

/**
 * Files in a conversation are private to its participants, limited in format
 * and size, and reachable only through the message they were sent with.
 */
class ChatAttachmentServiceTest {

    private ChatAttachmentRepository attachmentRepository;
    private DirectMessageRepository messageRepository;
    private DirectConversationRepository conversationRepository;
    private StoragePort storagePort;
    private ChatAttachmentService service;

    private final Clock clock = Clock.fixed(Instant.parse("2026-10-09T09:00:00Z"), ZoneOffset.UTC);
    private final UUID alice = UUID.fromString("11111111-1111-1111-1111-111111111111");
    private final UUID bob = UUID.fromString("22222222-2222-2222-2222-222222222222");
    private final UUID stranger = UUID.fromString("33333333-3333-3333-3333-333333333333");
    private final UUID conversationId = UUID.randomUUID();
    private final UUID messageId = UUID.randomUUID();
    private final UUID attachmentId = UUID.randomUUID();

    @BeforeEach
    void setUp() {
        attachmentRepository = mock(ChatAttachmentRepository.class);
        messageRepository = mock(DirectMessageRepository.class);
        conversationRepository = mock(DirectConversationRepository.class);
        storagePort = mock(StoragePort.class);

        when(attachmentRepository.save(any(ChatAttachment.class)))
                .thenAnswer(invocation -> invocation.getArgument(0));
        when(storagePort.store(anyString(), any(), anyLong()))
                .thenAnswer(invocation -> invocation.getArgument(0));

        service = new ChatAttachmentService(attachmentRepository, messageRepository,
                new ConversationAccess(conversationRepository), storagePort, clock);
    }

    @Test
    void shouldRejectMoreFilesThanOneMessageMayCarry() {
        // Arrange
        List<MultipartFile> six = List.of(image(), image(), image(), image(), image(), image());

        // Act and Assert
        assertThrows(FileRejectedError.class, () -> service.validateAll(six));
    }

    @Test
    void shouldRejectAnEmptyFile() {
        // Arrange
        MultipartFile empty = new MockMultipartFile("files", "trong.png", "image/png", new byte[0]);

        // Act and Assert
        assertThrows(FileRejectedError.class, () -> service.validateAll(List.of(empty)));
    }

    @Test
    void shouldRejectAFormatThatIsNotOnTheAllowlist() {
        // Arrange: an SVG runs script when rendered inline, which is why the
        // allowlist names formats rather than excluding known-bad ones.
        MultipartFile svg = new MockMultipartFile(
                "files", "anh.svg", "image/svg+xml", new byte[] { 1 });

        // Act and Assert
        assertThrows(FileRejectedError.class, () -> service.validateAll(List.of(svg)));
    }

    @Test
    void shouldRejectAFileWhoseFormatIsNotDeclared() {
        // Arrange
        MultipartFile unknown = new MockMultipartFile("files", "x.bin", null, new byte[] { 1 });

        // Act and Assert
        assertThrows(FileRejectedError.class, () -> service.validateAll(List.of(unknown)));
    }

    @Test
    void shouldRejectABatchOverTheTotalSizeLimit() {
        // Arrange: the cap is on the whole message, because the servlet caps the
        // whole request. Sizes are stubbed rather than allocated.
        MultipartFile half = sizedImage(ChatAttachmentService.MAX_TOTAL_BYTES / 2 + 1);

        // Act and Assert
        assertThrows(FileRejectedError.class, () -> service.validateAll(List.of(half, half)));
    }

    @Test
    void shouldAcceptEveryFormatOnTheAllowlist() {
        // Arrange
        List<MultipartFile> allowed = List.of(
                new MockMultipartFile("files", "a.png", "image/png", new byte[] { 1 }),
                new MockMultipartFile("files", "b.pdf", "application/pdf", new byte[] { 1 }),
                new MockMultipartFile("files", "c.txt", "text/plain", new byte[] { 1 }));

        // Act and Assert: no exception is the assertion here.
        service.validateAll(allowed);
    }

    @Test
    void shouldStoreEachFileUnderItsConversationAndMessage() {
        // Act
        service.attachAll(conversationId, messageId, List.of(image()));

        // Assert: the key namespaces the blob, so one conversation's files
        // cannot collide with or be guessed from another's.
        ArgumentCaptor<String> key = ArgumentCaptor.forClass(String.class);
        verify(storagePort).store(key.capture(), any(), anyLong());
        assertTrue(key.getValue().startsWith("chat/" + conversationId + "/" + messageId + "/"));
    }

    @Test
    void shouldNotReturnTheStorageKeyToClients() {
        // Act
        List<ChatAttachmentResponse> stored =
                service.attachAll(conversationId, messageId, List.of(image()));

        // Assert: the blob is reachable only through the authorised endpoint.
        ArgumentCaptor<ChatAttachment> saved = ArgumentCaptor.forClass(ChatAttachment.class);
        verify(attachmentRepository).save(saved.capture());
        assertFalse(stored.get(0).toString().contains(saved.getValue().getStorageKey()));
    }

    @Test
    void shouldHideAFileFromSomeoneOutsideTheConversation() {
        // Arrange
        when(conversationRepository.findById(conversationId))
                .thenReturn(Optional.of(conversation()));

        // Act and Assert
        assertThrows(NotFoundError.class,
                () -> service.read(stranger, conversationId, messageId, attachmentId));
        verify(storagePort, never()).retrieve(anyString());
    }

    @Test
    void shouldRefuseAMessageThatBelongsToAnotherConversation() {
        // Arrange: holding a message id from elsewhere must not let it be read
        // through a conversation the caller does belong to.
        when(conversationRepository.findById(conversationId))
                .thenReturn(Optional.of(conversation()));
        when(messageRepository.findById(messageId)).thenReturn(Optional.of(new DirectMessage(
                messageId, UUID.randomUUID(), bob, "ở nơi khác", Instant.now(clock))));

        // Act and Assert
        assertThrows(NotFoundError.class,
                () -> service.read(alice, conversationId, messageId, attachmentId));
        verify(storagePort, never()).retrieve(anyString());
    }

    @Test
    void shouldRefuseAnAttachmentThatBelongsToAnotherMessage() {
        // Arrange
        participantReadingAMessageInThisConversation();
        when(attachmentRepository.findByIdAndMessageId(attachmentId, messageId))
                .thenReturn(Optional.empty());

        // Act and Assert
        assertThrows(NotFoundError.class,
                () -> service.read(alice, conversationId, messageId, attachmentId));
    }

    @Test
    void shouldServeAnImageInlineAndEverythingElseAsADownload() {
        // Arrange
        participantReadingAMessageInThisConversation();
        when(storagePort.retrieve(anyString())).thenReturn(new byte[] { 1 });
        when(attachmentRepository.findByIdAndMessageId(attachmentId, messageId))
                .thenReturn(Optional.of(attachment(ChatAttachmentKind.IMAGE, "image/png")))
                .thenReturn(Optional.of(attachment(ChatAttachmentKind.FILE, "application/pdf")));

        // Act
        var asImage = service.read(alice, conversationId, messageId, attachmentId);
        var asFile = service.read(alice, conversationId, messageId, attachmentId);

        // Assert
        assertTrue(asImage.renderInline());
        assertFalse(asFile.renderInline());
        assertEquals("application/pdf", asFile.mediaType());
    }

    @Test
    void shouldGroupFilesByMessageForAWholePage() {
        // Arrange
        UUID otherMessageId = UUID.randomUUID();
        when(attachmentRepository.findByMessageIdInOrderByCreatedAtAsc(any()))
                .thenReturn(List.of(
                        attachment(ChatAttachmentKind.IMAGE, "image/png"),
                        new ChatAttachment(UUID.randomUUID(), otherMessageId,
                                ChatAttachmentKind.FILE, "chat/k", "b.pdf",
                                "application/pdf", 3L, Instant.now(clock))));

        // Act
        var grouped = service.listForAll(List.of(messageId, otherMessageId));

        // Assert: one query for a page of messages, not one per message.
        assertEquals(1, grouped.get(messageId).size());
        assertEquals(1, grouped.get(otherMessageId).size());
    }

    @Test
    void shouldNotQueryAtAllForAnEmptyPage() {
        // Act
        var grouped = service.listForAll(List.of());

        // Assert
        assertTrue(grouped.isEmpty());
        verify(attachmentRepository, never()).findByMessageIdInOrderByCreatedAtAsc(any());
    }

    private void participantReadingAMessageInThisConversation() {
        when(conversationRepository.findById(conversationId))
                .thenReturn(Optional.of(conversation()));
        when(messageRepository.findById(messageId)).thenReturn(Optional.of(new DirectMessage(
                messageId, conversationId, bob, "kèm tệp", Instant.now(clock))));
    }

    private ChatAttachment attachment(ChatAttachmentKind kind, String mediaType) {
        return new ChatAttachment(attachmentId, messageId, kind,
                "chat/" + conversationId + "/" + messageId + "/blob", "a.png",
                mediaType, 2L, Instant.now(clock));
    }

    private DirectConversation conversation() {
        return DirectConversation.between(conversationId, alice, bob, Instant.now(clock));
    }

    private MultipartFile image() {
        return new MockMultipartFile("files", "anh.png", "image/png", new byte[] { 1, 2 });
    }

    /** A file that reports a large size without allocating it. */
    private MultipartFile sizedImage(long size) {
        MultipartFile file = mock(MultipartFile.class);
        when(file.isEmpty()).thenReturn(false);
        when(file.getContentType()).thenReturn("image/png");
        when(file.getSize()).thenReturn(size);
        return file;
    }
}
