package com.unichat.core.communitychat.service;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.time.Instant;
import java.util.Optional;
import java.util.UUID;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import com.unichat.core.common.error.AuthorizationError;
import com.unichat.core.common.error.ConflictError;
import com.unichat.core.common.error.NotFoundError;
import com.unichat.core.communitychat.domain.AttachmentKind;
import com.unichat.core.communitychat.domain.Discussion;
import com.unichat.core.communitychat.domain.DiscussionRepository;
import com.unichat.core.communitychat.domain.PostAttachment;
import com.unichat.core.communitychat.domain.PostAttachmentRepository;
import com.unichat.core.communitychat.domain.SummaryState;
import com.unichat.core.workspace.domain.WorkspaceMember;
import com.unichat.core.workspace.domain.WorkspaceMemberRepository;
import com.unichat.core.workspace.domain.WorkspaceMemberStatus;
import com.unichat.core.workspace.domain.WorkspaceRole;

/**
 * Only members reach an attachment's summary, only documents can have one, and
 * an outcome is dropped when the post went away while it was produced.
 */
class AttachmentSummaryStoreTest {

    private final UUID workspaceId = UUID.randomUUID();
    private final UUID discussionId = UUID.randomUUID();
    private final UUID memberId = UUID.randomUUID();

    private DiscussionRepository discussionRepository;
    private PostAttachmentRepository attachmentRepository;
    private WorkspaceMemberRepository memberRepository;
    private AttachmentSummaryStore store;
    private Discussion discussion;
    private PostAttachment attachment;

    @BeforeEach
    void setUp() {
        discussionRepository = mock(DiscussionRepository.class);
        attachmentRepository = mock(PostAttachmentRepository.class);
        memberRepository = mock(WorkspaceMemberRepository.class);
        store = new AttachmentSummaryStore(discussionRepository, attachmentRepository, memberRepository);
        discussion = new Discussion(discussionId, workspaceId, memberId, "Tài liệu", "Nội dung",
                "QUESTION", false, "OPEN", Instant.now());
        attachment = attachmentOf(AttachmentKind.DOCUMENT, UUID.randomUUID());
        when(discussionRepository.findById(discussionId)).thenReturn(Optional.of(discussion));
        when(attachmentRepository.findByIdAndDiscussionId(attachment.getId(), discussionId))
                .thenReturn(Optional.of(attachment));
        when(attachmentRepository.findById(attachment.getId())).thenReturn(Optional.of(attachment));
        when(memberRepository.findByWorkspaceIdAndUserIdAndStatus(workspaceId, memberId,
                WorkspaceMemberStatus.ACTIVE)).thenReturn(Optional.of(new WorkspaceMember(workspaceId,
                memberId, WorkspaceRole.VIEWER, WorkspaceMemberStatus.ACTIVE, memberId)));
    }

    @Test
    void shouldRefuseSomeoneWhoIsNotAMember() {
        // Act & Assert
        assertThrows(AuthorizationError.class,
                () -> store.read(workspaceId, discussionId, attachment.getId(), UUID.randomUUID()));
    }

    @Test
    void shouldHideAnAttachmentOfADeletedPost() {
        // Arrange
        discussion.markDeleted(Instant.now());

        // Act & Assert
        assertThrows(NotFoundError.class, () -> store.read(workspaceId, discussionId, attachment.getId(), memberId));
    }

    @Test
    void shouldRefuseToSummariseAnImage() {
        // Arrange
        PostAttachment image = attachmentOf(AttachmentKind.IMAGE, null);
        when(attachmentRepository.findByIdAndDiscussionId(image.getId(), discussionId)).thenReturn(Optional.of(image));

        // Act & Assert
        assertThrows(ConflictError.class,
                () -> store.readSummarisable(workspaceId, discussionId, image.getId(), memberId));
    }

    @Test
    void shouldRefuseADocumentStillWaitingForApproval() {
        // Arrange
        PostAttachment unapproved = attachmentOf(AttachmentKind.DOCUMENT, null);
        when(attachmentRepository.findByIdAndDiscussionId(unapproved.getId(), discussionId))
                .thenReturn(Optional.of(unapproved));

        // Act & Assert
        ConflictError error = assertThrows(ConflictError.class,
                () -> store.readSummarisable(workspaceId, discussionId, unapproved.getId(), memberId));
        assertTrue(error.getMessage().contains("chờ trưởng nhóm duyệt"));
    }

    @Test
    void shouldMarkTheRequestSoWaitingReadersSeePending() {
        // Arrange
        attachment.markSummaryUnavailable();

        // Act
        store.markRequested(attachment.getId());

        // Assert
        assertEquals(SummaryState.PENDING, attachment.getSummaryState());
        verify(attachmentRepository).save(attachment);
    }

    @Test
    void shouldStoreASummaryAsReady() {
        // Act
        boolean stored = store.record(workspaceId, discussionId, attachment.getId(), "Tóm tắt.");

        // Assert
        assertTrue(stored);
        assertEquals(SummaryState.READY, attachment.getSummaryState());
        assertEquals("Tóm tắt.", attachment.getAiSummary());
    }

    @Test
    void shouldStoreAMissingSummaryAsUnavailable() {
        // Act
        store.record(workspaceId, discussionId, attachment.getId(), null);

        // Assert
        assertEquals(SummaryState.UNAVAILABLE, attachment.getSummaryState());
    }

    @Test
    void shouldDropTheOutcomeWhenThePostWasDeletedMeanwhile() {
        // Arrange
        discussion.markDeleted(Instant.now());

        // Act
        boolean stored = store.record(workspaceId, discussionId, attachment.getId(), "Tóm tắt.");

        // Assert
        assertFalse(stored);
        verify(attachmentRepository, never()).save(any());
    }

    private PostAttachment attachmentOf(AttachmentKind kind, UUID documentId) {
        return new PostAttachment(UUID.randomUUID(), discussionId, kind, "key", "tep", "application/pdf",
                1024L, documentId, memberId, Instant.now());
    }
}
