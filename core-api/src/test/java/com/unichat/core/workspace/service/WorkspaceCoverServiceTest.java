package com.unichat.core.workspace.service;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.awt.Color;
import java.awt.Graphics2D;
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

import com.unichat.core.common.error.AuthorizationError;
import com.unichat.core.common.error.NotFoundError;
import com.unichat.core.common.error.ValidationError;
import com.unichat.core.document.storage.StoragePort;
import com.unichat.core.workspace.domain.Workspace;
import com.unichat.core.workspace.domain.WorkspaceMember;
import com.unichat.core.workspace.domain.WorkspaceMemberRepository;
import com.unichat.core.workspace.domain.WorkspaceMemberStatus;
import com.unichat.core.workspace.domain.WorkspaceRepository;
import com.unichat.core.workspace.domain.WorkspaceRole;
import com.unichat.core.workspace.domain.WorkspaceVisibility;

/**
 * A cover is never stored as it arrived: it is redrawn at a fixed banner size,
 * which caps serving cost and drops the metadata a phone photo carries.
 */
class WorkspaceCoverServiceTest {

    private WorkspaceRepository workspaceRepository;
    private WorkspaceMemberRepository memberRepository;
    private StoragePort storagePort;
    private WorkspaceCoverService service;

    private final UUID workspaceId = UUID.randomUUID();
    private final UUID ownerId = UUID.randomUUID();
    private final UUID viewerId = UUID.randomUUID();
    private final UUID outsiderId = UUID.randomUUID();

    @BeforeEach
    void setUp() {
        workspaceRepository = mock(WorkspaceRepository.class);
        memberRepository = mock(WorkspaceMemberRepository.class);
        storagePort = mock(StoragePort.class);
        service = new WorkspaceCoverService(workspaceRepository, memberRepository, storagePort,
                Clock.fixed(Instant.parse("2026-09-26T00:00:00Z"), ZoneOffset.UTC));

        givenWorkspace(WorkspaceVisibility.PRIVATE);
        givenMember(ownerId, WorkspaceRole.OWNER);
        givenMember(viewerId, WorkspaceRole.VIEWER);
        when(memberRepository.findByWorkspaceIdAndUserIdAndStatus(
                workspaceId, outsiderId, WorkspaceMemberStatus.ACTIVE))
                .thenReturn(Optional.empty());
    }

    private Workspace givenWorkspace(WorkspaceVisibility visibility) {
        Workspace workspace = new Workspace(workspaceId, ownerId, "Khoa học dữ liệu",
                "Nhóm nghiên cứu", visibility, false, Instant.now());
        when(workspaceRepository.findById(workspaceId)).thenReturn(Optional.of(workspace));
        return workspace;
    }

    private void givenMember(UUID userId, WorkspaceRole role) {
        when(memberRepository.findByWorkspaceIdAndUserIdAndStatus(
                workspaceId, userId, WorkspaceMemberStatus.ACTIVE))
                .thenReturn(Optional.of(new WorkspaceMember(workspaceId, userId, role,
                        WorkspaceMemberStatus.ACTIVE, userId)));
    }

    /** A wide picture, so cropping to the banner ratio is a real operation. */
    private static MockMultipartFile image(int width, int height, String type) throws IOException {
        BufferedImage source = new BufferedImage(width, height, BufferedImage.TYPE_INT_RGB);
        Graphics2D graphics = source.createGraphics();
        graphics.setColor(Color.BLUE);
        graphics.fillRect(0, 0, width, height);
        graphics.dispose();

        ByteArrayOutputStream out = new ByteArrayOutputStream();
        ImageIO.write(source, "png", out);
        return new MockMultipartFile("file", "cover.png", type, out.toByteArray());
    }

    @Test
    void shouldRedrawTheUploadAtTheBannerSizeRatherThanStoreItAsSent() throws IOException {
        // Arrange: a tall square, which the banner shape must crop.
        MockMultipartFile upload = image(900, 900, "image/png");

        // Act
        service.upload(ownerId, workspaceId, upload);

        // Assert: what reached storage is the redrawn banner, not the original.
        ArgumentCaptor<ByteArrayInputStream> stored =
                ArgumentCaptor.forClass(ByteArrayInputStream.class);
        verify(storagePort).store(anyString(), stored.capture(), anyLong());

        BufferedImage written = ImageIO.read(stored.getValue());
        assertNotNull(written);
        assertEquals(1200, written.getWidth());
        assertEquals(400, written.getHeight());
    }

    @Test
    void shouldPointTheWorkspaceAtTheStoredCover() throws IOException {
        // Arrange
        Workspace workspace = givenWorkspace(WorkspaceVisibility.PRIVATE);

        // Act
        service.upload(ownerId, workspaceId, image(1200, 400, "image/png"));

        // Assert
        assertTrue(workspace.hasCoverImage());
        assertTrue(workspace.getCoverStorageKey().startsWith("covers/" + workspaceId + "/"));
        verify(workspaceRepository).save(workspace);
    }

    @Test
    void shouldDeleteTheCoverItReplacedSoBlobsDoNotAccumulate() throws IOException {
        // Arrange
        Workspace workspace = givenWorkspace(WorkspaceVisibility.PRIVATE);
        workspace.replaceCover("covers/old/previous.jpg");

        // Act
        service.upload(ownerId, workspaceId, image(1200, 400, "image/png"));

        // Assert
        verify(storagePort).delete("covers/old/previous.jpg");
    }

    @Test
    void shouldKeepTheNewCoverWhenDeletingTheOldBlobFails() throws IOException {
        // Arrange: the member's upload already succeeded, so a storage failure
        // while tidying up must not fail their request.
        Workspace workspace = givenWorkspace(WorkspaceVisibility.PRIVATE);
        workspace.replaceCover("covers/old/previous.jpg");
        doThrow(new RuntimeException("storage down")).when(storagePort).delete(anyString());

        // Act
        service.upload(ownerId, workspaceId, image(1200, 400, "image/png"));

        // Assert
        assertTrue(workspace.hasCoverImage());
        assertNotEquals("covers/old/previous.jpg", workspace.getCoverStorageKey());
    }

    @Test
    void shouldRefuseACoverChangeFromAViewer() throws IOException {
        // Arrange and Act and Assert: how a group presents itself is an
        // editorial decision, not something any member may change.
        MockMultipartFile upload = image(1200, 400, "image/png");
        assertThrows(AuthorizationError.class,
                () -> service.upload(viewerId, workspaceId, upload));
        verify(storagePort, never()).store(anyString(), any(), anyLong());
    }

    @Test
    void shouldHideThatAGroupExistsFromSomeoneOutsideIt() throws IOException {
        // Arrange and Act and Assert: "not found" rather than "forbidden", so a
        // caller probing ids cannot confirm which groups exist.
        MockMultipartFile upload = image(1200, 400, "image/png");
        assertThrows(NotFoundError.class,
                () -> service.upload(outsiderId, workspaceId, upload));
    }

    @Test
    void shouldRejectAFileThatIsNotADecodableImage() {
        // Arrange: the content type is only what the client claimed.
        MockMultipartFile notAnImage =
                new MockMultipartFile("file", "cover.png", "image/png", "not a png".getBytes());

        // Act and Assert
        assertThrows(ValidationError.class,
                () -> service.upload(ownerId, workspaceId, notAnImage));
        verify(storagePort, never()).store(anyString(), any(), anyLong());
    }

    @Test
    void shouldRejectAnUploadOverTheSizeLimit() {
        // Arrange
        MockMultipartFile huge = new MockMultipartFile(
                "file", "cover.jpg", "image/jpeg", new byte[6 * 1024 * 1024]);

        // Act and Assert
        assertThrows(ValidationError.class, () -> service.upload(ownerId, workspaceId, huge));
    }

    @Test
    void shouldRejectAFormatTheBrowserCannotBeTrustedToRender() {
        // Arrange: an SVG cover would be script the group serves to itself.
        MockMultipartFile svg = new MockMultipartFile(
                "file", "cover.svg", "image/svg+xml", "<svg/>".getBytes());

        // Act and Assert
        assertThrows(ValidationError.class, () -> service.upload(ownerId, workspaceId, svg));
    }

    @Test
    void shouldLetAnyoneReadThePictureOfAPublicGroup() {
        // Arrange: public groups appear in Khám phá for people who are not in
        // them, and a card there needs its picture.
        Workspace workspace = givenWorkspace(WorkspaceVisibility.PUBLIC);
        workspace.replaceCover("covers/x/cover.jpg");
        when(storagePort.retrieve("covers/x/cover.jpg")).thenReturn(new byte[] {1, 2, 3});

        // Act
        byte[] image = service.read(outsiderId, workspaceId);

        // Assert
        assertEquals(3, image.length);
    }

    @Test
    void shouldRefuseToServeThePictureOfAPrivateGroupToAnOutsider() {
        // Arrange
        Workspace workspace = givenWorkspace(WorkspaceVisibility.PRIVATE);
        workspace.replaceCover("covers/x/cover.jpg");

        // Act and Assert
        assertThrows(NotFoundError.class, () -> service.read(outsiderId, workspaceId));
        verify(storagePort, never()).retrieve(anyString());
    }

    @Test
    void shouldSayThereIsNoCoverRatherThanServeNothing() {
        // Arrange: a group that never uploaded one; the card draws its gradient.
        givenWorkspace(WorkspaceVisibility.PRIVATE);

        // Act and Assert
        assertThrows(NotFoundError.class, () -> service.read(ownerId, workspaceId));
    }

    @Test
    void shouldClearTheKeyAndDeleteTheBlobWhenTheCoverIsRemoved() {
        // Arrange
        Workspace workspace = givenWorkspace(WorkspaceVisibility.PRIVATE);
        workspace.replaceCover("covers/x/cover.jpg");

        // Act
        service.remove(ownerId, workspaceId);

        // Assert
        assertNull(workspace.getCoverStorageKey());
        verify(storagePort).delete("covers/x/cover.jpg");
    }
}
