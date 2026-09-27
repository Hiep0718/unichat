package com.unichat.core.communitychat.service;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.time.Instant;
import java.util.Optional;
import java.util.UUID;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.context.ApplicationEventPublisher;

import com.unichat.core.common.error.ValidationError;
import com.unichat.core.communitychat.api.CreateDiscussionRequest;
import com.unichat.core.communitychat.api.UpdateDiscussionRequest;
import com.unichat.core.communitychat.domain.Discussion;
import com.unichat.core.communitychat.domain.DiscussionReplyRepository;
import com.unichat.core.communitychat.domain.DiscussionRepository;
import com.unichat.core.user.domain.UserRepository;
import com.unichat.core.workspace.domain.WorkspaceMember;
import com.unichat.core.workspace.domain.WorkspaceMemberRepository;
import com.unichat.core.workspace.domain.WorkspaceMemberStatus;
import com.unichat.core.workspace.domain.WorkspaceRepository;
import com.unichat.core.workspace.domain.WorkspaceRole;

/**
 * The chosen colour has to survive the whole way from the request to the row.
 *
 * <p>Written after a post came back with no background and the cause turned
 * out to be a server running older code than the field: the request carried
 * the key, Jackson dropped it as unknown, and nothing anywhere said so. These
 * pin the wiring so a future silent drop fails here instead.
 */
class DiscussionBackgroundTest {

    private DiscussionRepository discussionRepository;
    private WorkspaceMemberRepository memberRepository;
    private DiscussionService service;

    private final UUID workspaceId = UUID.randomUUID();
    private final UUID authorId = UUID.randomUUID();

    @BeforeEach
    void setUp() {
        discussionRepository = mock(DiscussionRepository.class);
        memberRepository = mock(WorkspaceMemberRepository.class);

        service = new DiscussionService(
                discussionRepository,
                mock(DiscussionReplyRepository.class),
                memberRepository,
                mock(UserRepository.class),
                mock(WorkspaceRepository.class),
                mock(ApplicationEventPublisher.class),
                mock(PostAttachmentService.class),
                mock(MentionResolver.class),
                mock(ReactionService.class));

        when(memberRepository.findByWorkspaceIdAndUserIdAndStatus(
                workspaceId, authorId, WorkspaceMemberStatus.ACTIVE))
                .thenReturn(Optional.of(new WorkspaceMember(workspaceId, authorId,
                        WorkspaceRole.EDITOR, WorkspaceMemberStatus.ACTIVE, authorId)));
    }

    private Discussion captureSaved() {
        ArgumentCaptor<Discussion> saved = ArgumentCaptor.forClass(Discussion.class);
        verify(discussionRepository).save(saved.capture());
        return saved.getValue();
    }

    @Test
    void shouldPersistTheColourTheAuthorChose() {
        // Arrange
        var request = new CreateDiscussionRequest("demo", "Họp lúc 3 giờ nhé", "DISCUSSION", "ocean");

        // Act
        service.createDiscussion(workspaceId, authorId, request);

        // Assert
        assertEquals("ocean", captureSaved().getBackgroundKey());
    }

    @Test
    void shouldLeaveAnOrdinaryPostWithoutOne() {
        // Arrange
        var request = new CreateDiscussionRequest("demo", "Nội dung", "DISCUSSION", null);

        // Act
        service.createDiscussion(workspaceId, authorId, request);

        // Assert
        assertNull(captureSaved().getBackgroundKey());
    }

    @Test
    void shouldRefuseAColourOnABodyTooLongToReadOnOne() {
        // Arrange
        String tooLong = "a".repeat(PostBackground.MAX_BODY_LENGTH + 1);
        var request = new CreateDiscussionRequest("demo", tooLong, "DISCUSSION", "dusk");

        // Act and Assert: rejected rather than quietly saved without the
        // colour, so the author finds out their choice did not take.
        assertThrows(ValidationError.class,
                () -> service.createDiscussion(workspaceId, authorId, request));
    }

    @Test
    void shouldKeepTheColourThroughAnEdit() {
        // Arrange: an absent key means "no background", so an edit that does
        // not resend it would strip the colour every time.
        UUID discussionId = UUID.randomUUID();
        Discussion existing = new Discussion(discussionId, workspaceId, authorId, "demo",
                "Họp lúc 3 giờ nhé", "DISCUSSION", false, "OPEN", Instant.now());
        existing.setBackgroundKey("ocean");
        when(discussionRepository.findById(discussionId)).thenReturn(Optional.of(existing));

        // Act
        service.updateDiscussion(workspaceId, discussionId, authorId,
                new UpdateDiscussionRequest("demo", "Họp lúc 4 giờ nhé", "ocean"));

        // Assert
        assertEquals("ocean", existing.getBackgroundKey());
    }

    @Test
    void shouldLetAnAuthorRemoveTheColourByEditing() {
        // Arrange
        UUID discussionId = UUID.randomUUID();
        Discussion existing = new Discussion(discussionId, workspaceId, authorId, "demo",
                "Nội dung", "DISCUSSION", false, "OPEN", Instant.now());
        existing.setBackgroundKey("ocean");
        when(discussionRepository.findById(discussionId)).thenReturn(Optional.of(existing));

        // Act
        service.updateDiscussion(workspaceId, discussionId, authorId,
                new UpdateDiscussionRequest("demo", "Nội dung", null));

        // Assert
        assertNull(existing.getBackgroundKey());
    }

    @Test
    void shouldNotAcceptAColourTheFrontendCannotDraw() {
        // Arrange
        var request = new CreateDiscussionRequest("demo", "Ngắn", "DISCUSSION", "neon-zebra");

        // Act and Assert
        assertThrows(ValidationError.class,
                () -> service.createDiscussion(workspaceId, authorId, request));
        verify(discussionRepository, org.mockito.Mockito.never()).save(any(Discussion.class));
    }
}
