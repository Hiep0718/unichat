package com.unichat.core.workchat.service;

import static org.junit.jupiter.api.Assertions.assertArrayEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.awt.image.BufferedImage;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import javax.imageio.ImageIO;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.mock.web.MockMultipartFile;

import com.unichat.core.common.error.AuthorizationError;
import com.unichat.core.common.error.NotFoundError;
import com.unichat.core.common.error.ValidationError;
import com.unichat.core.document.storage.StoragePort;
import com.unichat.core.workchat.domain.ConversationListChangedEvent;
import com.unichat.core.workchat.domain.ConversationParticipant;
import com.unichat.core.workchat.domain.ConversationParticipantRepository;
import com.unichat.core.workchat.domain.DirectConversation;
import com.unichat.core.workchat.domain.DirectConversationRepository;
import com.unichat.core.workchat.domain.ParticipantRole;

/**
 * A group's picture is the owner's to set and every member's to see, an upload
 * is never stored as it arrived, and replacing one does not leave the old blob
 * behind.
 */
class GroupAvatarServiceTest {

    private DirectConversationRepository conversationRepository;
    private ConversationParticipantRepository participantRepository;
    private StoragePort storagePort;
    private ApplicationEventPublisher eventPublisher;
    private GroupAvatarService service;

    private final Instant joinedAt = Instant.parse("2026-10-09T09:00:00Z");
    private final UUID alice = UUID.fromString("11111111-1111-1111-1111-111111111111");
    private final UUID bob = UUID.fromString("22222222-2222-2222-2222-222222222222");
    private final UUID stranger = UUID.fromString("44444444-4444-4444-4444-444444444444");
    private final UUID conversationId = UUID.randomUUID();

    private DirectConversation group;

    @BeforeEach
    void setUp() {
        conversationRepository = mock(DirectConversationRepository.class);
        participantRepository = mock(ConversationParticipantRepository.class);
        storagePort = mock(StoragePort.class);
        eventPublisher = mock(ApplicationEventPublisher.class);

        group = DirectConversation.group(conversationId, "Nhóm đồ án", alice, joinedAt);
        when(conversationRepository.findById(conversationId)).thenReturn(Optional.of(group));
        when(conversationRepository.save(any(DirectConversation.class)))
                .thenAnswer(invocation -> invocation.getArgument(0));
        ConversationParticipant owner = participates(alice, ParticipantRole.OWNER);
        ConversationParticipant member = participates(bob, ParticipantRole.MEMBER);
        when(participantRepository.findByIdConversationIdAndIdUserId(conversationId, stranger))
                .thenReturn(Optional.empty());
        // Who the change is announced to is read from the whole roster, not
        // from the one row the caller was looked up by.
        when(participantRepository.findByIdConversationIdOrderByJoinedAtAsc(conversationId))
                .thenReturn(List.of(owner, member));

        service = new GroupAvatarService(
                conversationRepository,
                new ConversationAccess(conversationRepository, participantRepository),
                storagePort,
                eventPublisher);
    }

    @Test
    void shouldStoreTheOwnersUploadAndPointTheGroupAtIt() {
        // Arrange
        MockMultipartFile upload = pngUpload(600, 400);

        // Act
        service.upload(alice, conversationId, upload);

        // Assert
        ArgumentCaptor<String> key = ArgumentCaptor.forClass(String.class);
        verify(storagePort).store(key.capture(), any(InputStream.class), anyLong());
        assertTrue(key.getValue().startsWith("group-avatars/" + conversationId + "/"));
        assertTrue(group.hasAvatarImage());
        verify(conversationRepository).save(group);
    }

    @Test
    void shouldRedrawTheUploadRatherThanStoreTheBytesItArrivedAs() throws IOException {
        // Arrange: a phone photo otherwise ships its EXIF data, GPS included,
        // to everyone who can see the group.
        MockMultipartFile wide = pngUpload(600, 400);

        // Act
        service.upload(alice, conversationId, wide);

        // Assert
        ArgumentCaptor<InputStream> stored = ArgumentCaptor.forClass(InputStream.class);
        verify(storagePort).store(anyString(), stored.capture(), anyLong());
        BufferedImage written = ImageIO.read(stored.getValue());
        assertTrue(written.getWidth() == written.getHeight(),
                "Expected a square, got " + written.getWidth() + "x" + written.getHeight());
    }

    @Test
    void shouldRefuseAnUploadFromAMemberWhoIsNotTheOwner() {
        // Arrange: hiding the button is clarity; this is what enforces it.
        MockMultipartFile upload = pngUpload(200, 200);

        // Act and Assert
        assertThrows(AuthorizationError.class,
                () -> service.upload(bob, conversationId, upload));
        verify(storagePort, never()).store(anyString(), any(InputStream.class), anyLong());
        assertFalse(group.hasAvatarImage());
    }

    @Test
    void shouldTellSomeoneOutsideTheGroupThatItDoesNotExist() {
        // Arrange: a different answer would confirm the group to a stranger
        // who guessed its id.
        MockMultipartFile upload = pngUpload(200, 200);

        // Act and Assert
        assertThrows(NotFoundError.class,
                () -> service.upload(stranger, conversationId, upload));
    }

    @Test
    void shouldRefuseAFileThatIsNotAnImageWhateverItClaimsToBe() {
        // Arrange: the declared content type is only what the client said.
        MockMultipartFile liar = new MockMultipartFile(
                "file", "cat.png", "image/png", "not an image at all".getBytes());

        // Act and Assert
        assertThrows(ValidationError.class,
                () -> service.upload(alice, conversationId, liar));
        verify(storagePort, never()).store(anyString(), any(InputStream.class), anyLong());
    }

    @Test
    void shouldDeleteThePictureTheNewOneReplaced() {
        // Arrange
        service.upload(alice, conversationId, pngUpload(200, 200));
        String first = group.getAvatarStorageKey();

        // Act
        service.upload(alice, conversationId, pngUpload(200, 200));

        // Assert
        verify(storagePort).delete(first);
    }

    @Test
    void shouldKeepTheNewPictureWhenDeletingTheOldOneFails() {
        // Arrange: an orphaned blob costs storage; failing here would throw
        // away the picture the owner just uploaded successfully.
        service.upload(alice, conversationId, pngUpload(200, 200));
        String first = group.getAvatarStorageKey();
        doThrow(new IllegalStateException("object store unreachable"))
                .when(storagePort).delete(first);

        // Act
        service.upload(alice, conversationId, pngUpload(200, 200));

        // Assert
        assertTrue(group.hasAvatarImage());
        verify(conversationRepository, times(2)).save(group);
    }

    @Test
    void shouldLeaveTheDrawnFallbackWhenTheOwnerRemovesThePicture() {
        // Arrange
        service.upload(alice, conversationId, pngUpload(200, 200));
        String stored = group.getAvatarStorageKey();

        // Act
        service.remove(alice, conversationId);

        // Assert
        assertFalse(group.hasAvatarImage());
        verify(storagePort).delete(stored);
    }

    @Test
    void shouldLetAnyMemberReadThePicture() {
        // Arrange: everyone in the group sees the group.
        service.upload(alice, conversationId, pngUpload(200, 200));
        byte[] bytes = "png bytes".getBytes();
        when(storagePort.retrieve(group.getAvatarStorageKey())).thenReturn(bytes);

        // Act
        byte[] read = service.read(bob, conversationId);

        // Assert
        assertArrayEquals(bytes, read);
    }

    @Test
    void shouldReportAGroupWithNoPictureAsNotFound() {
        // Act and Assert
        assertThrows(NotFoundError.class, () -> service.read(alice, conversationId));
    }

    @Test
    void shouldTellTheOtherMembersTheirListIsOutOfDate() {
        // Arrange: without this they keep the old picture until a reload.

        // Act
        service.upload(alice, conversationId, pngUpload(200, 200));

        // Assert
        ArgumentCaptor<ConversationListChangedEvent> event =
                ArgumentCaptor.forClass(ConversationListChangedEvent.class);
        verify(eventPublisher).publishEvent(event.capture());
        assertTrue(event.getValue().recipientIds().contains(bob));
        assertFalse(event.getValue().recipientIds().contains(alice),
                "The owner's own client already knows");
    }

    /** Registers someone as taking part, in the role given. */
    private ConversationParticipant participates(UUID userId, ParticipantRole role) {
        ConversationParticipant participant =
                new ConversationParticipant(conversationId, userId, role, joinedAt);
        when(participantRepository.findByIdConversationIdAndIdUserId(conversationId, userId))
                .thenReturn(Optional.of(participant));
        return participant;
    }

    /** A real PNG of the given size, so the decode under test has something to do. */
    private static MockMultipartFile pngUpload(int width, int height) {
        try {
            BufferedImage image = new BufferedImage(width, height, BufferedImage.TYPE_INT_ARGB);
            ByteArrayOutputStream out = new ByteArrayOutputStream();
            ImageIO.write(image, "png", out);
            return new MockMultipartFile("file", "group.png", "image/png", out.toByteArray());
        } catch (IOException e) {
            throw new IllegalStateException("Could not build the test image", e);
        }
    }
}
