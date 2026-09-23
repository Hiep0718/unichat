package com.unichat.core.user.service;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.awt.image.BufferedImage;
import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.time.Clock;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.Optional;
import java.util.UUID;

import javax.imageio.ImageIO;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.mock.web.MockMultipartFile;

import com.unichat.core.common.error.NotFoundError;
import com.unichat.core.common.error.ValidationError;
import com.unichat.core.document.storage.StoragePort;
import com.unichat.core.user.domain.SystemRole;
import com.unichat.core.user.domain.User;
import com.unichat.core.user.domain.UserRepository;
import com.unichat.core.user.domain.UserStatus;

/**
 * An upload is never stored as it arrived: it is redrawn at a fixed square
 * size, which caps serving cost and drops the metadata a phone photo carries.
 */
class AvatarServiceTest {

    private UserRepository userRepository;
    private StoragePort storagePort;
    private AvatarService service;
    private User user;

    private final UUID userId = UUID.randomUUID();
    private final Clock clock = Clock.fixed(Instant.parse("2026-09-23T09:00:00Z"), ZoneOffset.UTC);

    @BeforeEach
    void setUp() {
        userRepository = mock(UserRepository.class);
        storagePort = mock(StoragePort.class);
        service = new AvatarService(userRepository, storagePort, clock);

        user = new User(userId, "hung@example.com", "hash",
                SystemRole.USER, UserStatus.ACTIVE, Instant.now(clock));
        when(userRepository.findById(userId)).thenReturn(Optional.of(user));
    }

    @Test
    void shouldRedrawTheUploadAsAFixedSquarePngRatherThanStoringWhatArrived() throws IOException {
        // Arrange: a wide image, deliberately not square.
        MockMultipartFile upload = imageOf(800, 400, "image/jpeg");

        // Act
        service.upload(userId, upload);

        // Assert
        ArgumentCaptor<ByteArrayInputStream> stored = ArgumentCaptor.forClass(ByteArrayInputStream.class);
        verify(storagePort).store(anyString(), stored.capture(), anyLong());
        BufferedImage result = ImageIO.read(stored.getValue());
        assertNotNull(result, "the stored bytes must decode as an image");
        assertEquals(result.getWidth(), result.getHeight(), "stored avatar must be square");
        assertEquals(256, result.getWidth());
    }

    @Test
    void shouldPointTheMemberAtTheNewPicture() throws IOException {
        // Act
        service.upload(userId, imageOf(300, 300, "image/png"));

        // Assert
        assertEquals(true, user.hasAvatarImage());
        verify(userRepository).save(user);
    }

    @Test
    void shouldDeleteThePictureItReplacedSoBlobsDoNotAccumulate() throws IOException {
        // Arrange
        user.replaceAvatar("avatars/old-key.png");

        // Act
        service.upload(userId, imageOf(300, 300, "image/png"));

        // Assert
        verify(storagePort).delete("avatars/old-key.png");
    }

    @Test
    void shouldKeepTheNewPictureEvenIfDeletingTheOldOneFails() throws IOException {
        // Arrange: an orphaned blob costs storage; losing the upload costs the
        // member the thing they just did.
        user.replaceAvatar("avatars/old-key.png");
        org.mockito.Mockito.doThrow(new RuntimeException("storage down"))
                .when(storagePort).delete("avatars/old-key.png");

        // Act
        service.upload(userId, imageOf(300, 300, "image/png"));

        // Assert
        assertEquals(true, user.hasAvatarImage());
    }

    @Test
    void shouldRefuseAFileThatIsNotAnImageEvenWhenItClaimsToBe() {
        // Arrange: the content type is only what the client said.
        MockMultipartFile notAnImage = new MockMultipartFile(
                "file", "evil.png", "image/png", "this is not a PNG".getBytes());

        // Act and Assert
        assertThrows(ValidationError.class, () -> service.upload(userId, notAnImage));
        verify(storagePort, never()).store(anyString(), any(), anyLong());
    }

    @Test
    void shouldRefuseATypeTheAppDoesNotAccept() {
        // Arrange
        MockMultipartFile pdf = new MockMultipartFile(
                "file", "cv.pdf", "application/pdf", "%PDF-1.7".getBytes());

        // Act and Assert
        assertThrows(ValidationError.class, () -> service.upload(userId, pdf));
    }

    @Test
    void shouldRefuseAnEmptyUpload() {
        // Arrange
        MockMultipartFile empty = new MockMultipartFile(
                "file", "a.png", "image/png", new byte[0]);

        // Act and Assert
        assertThrows(ValidationError.class, () -> service.upload(userId, empty));
    }

    @Test
    void shouldLeaveTheLetterAvatarWhenThePictureIsRemoved() throws IOException {
        // Arrange
        service.upload(userId, imageOf(300, 300, "image/png"));

        // Act
        service.remove(userId);

        // Assert
        assertEquals(false, user.hasAvatarImage());
    }

    @Test
    void shouldRefuseAColourTheAppDoesNotOffer() {
        // Act and Assert: a free-form hex behind white initials is easily
        // unreadable, so only the offered set is accepted.
        assertThrows(ValidationError.class, () -> service.chooseColour(userId, "#ff00ff"));
    }

    @Test
    void shouldReturnToTheDerivedColourWhenNoneIsChosen() {
        // Arrange
        service.chooseColour(userId, "teal");

        // Act
        service.chooseColour(userId, null);

        // Assert
        assertNull(user.getAvatarColor());
    }

    @Test
    void shouldReportNoPictureRatherThanServingNothing() {
        // Act and Assert
        assertThrows(NotFoundError.class, () -> service.read(userId));
    }

    private MockMultipartFile imageOf(int width, int height, String contentType) throws IOException {
        BufferedImage image = new BufferedImage(width, height, BufferedImage.TYPE_INT_RGB);
        ByteArrayOutputStream out = new ByteArrayOutputStream();
        ImageIO.write(image, contentType.endsWith("jpeg") ? "jpg" : "png", out);
        return new MockMultipartFile("file", "avatar", contentType, out.toByteArray());
    }
}
