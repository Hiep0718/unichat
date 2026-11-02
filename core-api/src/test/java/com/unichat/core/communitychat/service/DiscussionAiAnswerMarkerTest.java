package com.unichat.core.communitychat.service;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyList;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;

import com.unichat.core.communitychat.api.CreateDiscussionRequest;
import com.unichat.core.communitychat.api.DiscussionResponse;
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
 * The post list reports which posts the assistant has answered.
 *
 * <p>The group's post cards draw a marker from this, so a reader can tell an
 * answered question from an open one without opening it. Two things have to
 * hold: the flag must follow the replies rather than a default, and the whole
 * page must cost one query — this marker appears on every card, so asking per
 * card is a query per row.
 */
class DiscussionAiAnswerMarkerTest {

    private DiscussionRepository discussionRepository;
    private DiscussionReplyRepository replyRepository;
    private ReactionService reactionService;
    private PostAttachmentService attachmentService;
    private DiscussionService service;

    private final UUID workspaceId = UUID.randomUUID();
    private final UUID readerId = UUID.randomUUID();

    private final UUID answeredId = UUID.randomUUID();
    private final UUID unansweredId = UUID.randomUUID();

    @BeforeEach
    void setUp() {
        discussionRepository = mock(DiscussionRepository.class);
        replyRepository = mock(DiscussionReplyRepository.class);
        reactionService = mock(ReactionService.class);
        attachmentService = mock(PostAttachmentService.class);
        WorkspaceMemberRepository memberRepository = mock(WorkspaceMemberRepository.class);

        service = new DiscussionService(
                discussionRepository,
                replyRepository,
                memberRepository,
                mock(UserRepository.class),
                mock(WorkspaceRepository.class),
                mock(ApplicationEventPublisher.class),
                attachmentService,
                mock(MentionResolver.class),
                reactionService);

        when(memberRepository.findByWorkspaceIdAndUserIdAndStatus(
                workspaceId, readerId, WorkspaceMemberStatus.ACTIVE))
                .thenReturn(Optional.of(new WorkspaceMember(workspaceId, readerId,
                        WorkspaceRole.EDITOR, WorkspaceMemberStatus.ACTIVE, readerId)));

        when(attachmentService.listForAll(anyList())).thenReturn(Map.of());
        when(reactionService.summariseAll(anyString(), anyList(), any())).thenReturn(Map.of());
    }

    /** Two posts on one page: the first answered by the assistant, the second not. */
    private void givenAPageOfTwoPosts() {
        Page<Discussion> page = new PageImpl<>(List.of(
                postWithId(answeredId, "Cho tôi đề mẫu"),
                postWithId(unansweredId, "Học MongoDB có khó không?")));
        when(discussionRepository.findByWorkspaceIdOrderByCreatedAtDesc(eq(workspaceId), any(Pageable.class)))
                .thenReturn(page);
    }

    private Discussion postWithId(UUID id, String title) {
        return new Discussion(id, workspaceId, readerId, title, "Nội dung",
                "QUESTION", false, "OPEN", Instant.now());
    }

    @Test
    void shouldMarkOnlyThePostsTheAssistantAnswered() {
        // Arrange
        givenAPageOfTwoPosts();
        when(replyRepository.findIdsWithAiAnswer(anyList())).thenReturn(List.of(answeredId));

        // Act
        Page<DiscussionResponse> result =
                service.listDiscussions(workspaceId, readerId, null, "NEW", null, 0, 20);

        // Assert
        assertTrue(result.getContent().get(0).hasAiAnswer(),
                "bài đã được trợ lý trả lời phải mang dấu");
        assertFalse(result.getContent().get(1).hasAiAnswer(),
                "bài chưa được trả lời thì không");
    }

    @Test
    void shouldAskOnceForAWholePageRatherThanOncePerCard() {
        // Arrange
        givenAPageOfTwoPosts();
        when(replyRepository.findIdsWithAiAnswer(anyList())).thenReturn(List.of(answeredId));

        // Act
        service.listDiscussions(workspaceId, readerId, null, "NEW", null, 0, 20);

        // Assert
        verify(replyRepository, times(1)).findIdsWithAiAnswer(anyList());
        verify(replyRepository, never()).hasAiAnswer(any());
    }

    @Test
    void shouldAskAboutEveryPostOnThePage() {
        // Arrange
        givenAPageOfTwoPosts();
        when(replyRepository.findIdsWithAiAnswer(anyList())).thenReturn(List.of());

        // Act
        service.listDiscussions(workspaceId, readerId, null, "NEW", null, 0, 20);

        // Assert
        verify(replyRepository).findIdsWithAiAnswer(List.of(answeredId, unansweredId));
    }

    @Test
    void shouldNotQueryWhenTheGroupHasNoPostsYet() {
        // Arrange: an empty page carries no ids, and `IN ()` is not a query
        // worth sending.
        when(discussionRepository.findByWorkspaceIdOrderByCreatedAtDesc(eq(workspaceId), any(Pageable.class)))
                .thenReturn(new PageImpl<>(List.of()));

        // Act
        Page<DiscussionResponse> result =
                service.listDiscussions(workspaceId, readerId, null, "NEW", null, 0, 20);

        // Assert
        assertEquals(0, result.getTotalElements());
        verify(replyRepository, never()).findIdsWithAiAnswer(anyList());
    }

    @Test
    void shouldReportAFreshPostAsUnanswered() {
        // Arrange
        var request = new CreateDiscussionRequest("Tiêu đề", "Nội dung", "QUESTION", null);

        // Act
        DiscussionResponse created = service.createDiscussion(workspaceId, readerId, request);

        // Assert: a post created a statement ago has no replies, so this needs
        // no query to be right.
        assertFalse(created.hasAiAnswer());
        verify(replyRepository, never()).hasAiAnswer(any());
    }
}
