package com.unichat.core.communitychat.service;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.time.Clock;
import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockMultipartFile;

import com.unichat.core.common.error.AuthorizationError;
import com.unichat.core.common.error.ValidationError;
import com.unichat.core.communitychat.domain.AttachmentKind;
import com.unichat.core.communitychat.domain.Discussion;
import com.unichat.core.communitychat.domain.DiscussionRepository;
import com.unichat.core.communitychat.domain.PostAttachment;
import com.unichat.core.communitychat.domain.PostAttachmentRepository;
import com.unichat.core.document.api.IngestionJobResponse;
import com.unichat.core.document.domain.DocumentStatus;
import com.unichat.core.document.service.DocumentService;
import com.unichat.core.document.storage.StoragePort;
import com.unichat.core.workspace.domain.WorkspaceMember;
import com.unichat.core.workspace.domain.WorkspaceMemberRepository;
import com.unichat.core.workspace.domain.WorkspaceMemberStatus;
import com.unichat.core.workspace.domain.WorkspaceRole;

class PostAttachmentServiceTest {

    private PostAttachmentRepository attachmentRepository;
    private DiscussionRepository discussionRepository;
    private WorkspaceMemberRepository memberRepository;
    private DocumentService documentService;
    private StoragePort storagePort;
    private PostAttachmentService service;

    private final UUID workspaceId = UUID.randomUUID();
    private final UUID discussionId = UUID.randomUUID();
    private final UUID authorId = UUID.randomUUID();

    @BeforeEach
    void setUp() {
        attachmentRepository = mock(PostAttachmentRepository.class);
        discussionRepository = mock(DiscussionRepository.class);
        memberRepository = mock(WorkspaceMemberRepository.class);
        documentService = mock(DocumentService.class);
        storagePort = mock(StoragePort.class);
        service = new PostAttachmentService(attachmentRepository, discussionRepository,
                memberRepository, documentService, storagePort, Clock.systemUTC());

        when(storagePort.store(anyString(), any(), org.mockito.ArgumentMatchers.anyLong()))
                .thenAnswer(invocation -> invocation.getArgument(0));
        when(attachmentRepository.findByDiscussionIdOrderByCreatedAtAsc(discussionId))
                .thenReturn(List.of());
    }

    /** Makes the author an active member owning the post. */
    private Discussion givenAuthoredPost() {
        Discussion discussion = new Discussion(discussionId, workspaceId, authorId, "Đề cương môn học",
                "body", "ANNOUNCEMENT", false, "OPEN", Instant.now());
        when(discussionRepository.findById(discussionId)).thenReturn(Optional.of(discussion));
        when(memberRepository.findByWorkspaceIdAndUserIdAndStatus(workspaceId, authorId, WorkspaceMemberStatus.ACTIVE))
                .thenReturn(Optional.of(new WorkspaceMember(workspaceId, authorId,
                        WorkspaceRole.EDITOR, WorkspaceMemberStatus.ACTIVE, authorId)));
        return discussion;
    }

    @Test
    void shouldDropThePostsColourOnceAFileIsAttached() {
        // Arrange: a photo grid on top of a gradient is noise, so the file wins.
        Discussion discussion = givenAuthoredPost();
        discussion.setBackgroundKey("ocean");
        var file = new MockMultipartFile("file", "anh.png", "image/png", "png".getBytes());

        // Act
        service.attach(workspaceId, discussionId, authorId, file, "req-1");

        // Assert
        assertNull(discussion.getBackgroundKey());
        verify(discussionRepository).save(discussion);
    }

    @Test
    void shouldNotRewriteAPostThatHadNoColourToBeginWith() {
        // Arrange: the overwhelming majority of posts, which must not take an
        // extra write on every attachment.
        givenAuthoredPost();
        var file = new MockMultipartFile("file", "anh.png", "image/png", "png".getBytes());

        // Act
        service.attach(workspaceId, discussionId, authorId, file, "req-1");

        // Assert
        verify(discussionRepository, never()).save(any(Discussion.class));
    }

    @Test
    void shouldRegisterADocumentAttachmentInTheGroupLibrary() {
        // Arrange
        givenAuthoredPost();
        var documentId = UUID.randomUUID();
        var file = new MockMultipartFile("file", "de-cuong.pdf", "application/pdf", "pdf".getBytes());
        when(documentService.uploadDocument(eq(authorId), eq(workspaceId), any(), anyString(), anyString(), anyString()))
                .thenReturn(new IngestionJobResponse(documentId, UUID.randomUUID(), DocumentStatus.PENDING, "ok"));

        // Act
        var response = service.attach(workspaceId, discussionId, authorId, file, "req-1");

        // Assert
        assertEquals(AttachmentKind.DOCUMENT, response.kind());
        assertEquals(documentId, response.documentId());
        verify(attachmentRepository).save(any(PostAttachment.class));
    }

    @Test
    void shouldKeepImagesOutOfTheGroupLibrary() {
        // Arrange — an image illustrates a post and must never become a source.
        givenAuthoredPost();
        var file = new MockMultipartFile("file", "anh.png", "image/png", "png".getBytes());

        // Act
        var response = service.attach(workspaceId, discussionId, authorId, file, "req-1");

        // Assert
        assertEquals(AttachmentKind.IMAGE, response.kind());
        assertNull(response.documentId());
        verify(documentService, never())
                .uploadDocument(any(), any(), any(), anyString(), anyString(), anyString());
    }

    @Test
    void shouldRejectAnUnsupportedFileType() {
        // Arrange
        givenAuthoredPost();
        var file = new MockMultipartFile("file", "virus.exe", "application/x-msdownload", "x".getBytes());

        // Act and Assert
        assertThrows(ValidationError.class,
                () -> service.attach(workspaceId, discussionId, authorId, file, "req-1"));
    }

    @Test
    void shouldRejectAnAttachmentFromSomeoneOtherThanTheAuthor() {
        // Arrange
        var otherMember = UUID.randomUUID();
        Discussion discussion = new Discussion(discussionId, workspaceId, authorId, "Bài viết",
                "body", "DISCUSSION", false, "OPEN", Instant.now());
        when(discussionRepository.findById(discussionId)).thenReturn(Optional.of(discussion));
        when(memberRepository.findByWorkspaceIdAndUserIdAndStatus(workspaceId, otherMember, WorkspaceMemberStatus.ACTIVE))
                .thenReturn(Optional.of(new WorkspaceMember(workspaceId, otherMember,
                        WorkspaceRole.EDITOR, WorkspaceMemberStatus.ACTIVE, otherMember)));
        var file = new MockMultipartFile("file", "anh.png", "image/png", "png".getBytes());

        // Act and Assert
        assertThrows(AuthorizationError.class,
                () -> service.attach(workspaceId, discussionId, otherMember, file, "req-1"));
    }

    @Test
    void shouldRejectAnAttachmentFromSomeoneWhoIsNotAMember() {
        // Arrange
        var outsider = UUID.randomUUID();
        when(memberRepository.findByWorkspaceIdAndUserIdAndStatus(workspaceId, outsider, WorkspaceMemberStatus.ACTIVE))
                .thenReturn(Optional.empty());
        var file = new MockMultipartFile("file", "anh.png", "image/png", "png".getBytes());

        // Act and Assert
        assertThrows(AuthorizationError.class,
                () -> service.attach(workspaceId, discussionId, outsider, file, "req-1"));
    }
}
