package com.unichat.core.communitychat.service;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.Mockito.atLeastOnce;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.context.ApplicationEventPublisher;

import com.unichat.core.chat.service.ChatActor;
import com.unichat.core.communitychat.api.CreateReplyRequest;
import com.unichat.core.communitychat.domain.AiMentionEvent;
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
 * A comment that names {@code @AI} hands the assistant the commenter's own
 * session, so the answer is authorized as that person.
 */
class DiscussionAiMentionTest {

    private final UUID workspaceId = UUID.randomUUID();
    private final UUID discussionId = UUID.randomUUID();
    private final ChatActor asker = new ChatActor(UUID.randomUUID(), UUID.randomUUID(), 7L);

    private ApplicationEventPublisher events;
    private DiscussionService service;

    @BeforeEach
    void setUp() {
        DiscussionRepository discussionRepository = mock(DiscussionRepository.class);
        WorkspaceMemberRepository memberRepository = mock(WorkspaceMemberRepository.class);
        events = mock(ApplicationEventPublisher.class);
        service = new DiscussionService(discussionRepository, mock(DiscussionReplyRepository.class),
                memberRepository, mock(UserRepository.class), mock(WorkspaceRepository.class), events,
                mock(PostAttachmentService.class), mock(MentionResolver.class), mock(ReactionService.class));

        when(memberRepository.findByWorkspaceIdAndUserIdAndStatus(
                workspaceId, asker.userId(), WorkspaceMemberStatus.ACTIVE))
                .thenReturn(Optional.of(new WorkspaceMember(workspaceId, asker.userId(),
                        WorkspaceRole.VIEWER, WorkspaceMemberStatus.ACTIVE, asker.userId())));
        when(discussionRepository.findById(discussionId)).thenReturn(Optional.of(new Discussion(
                discussionId, workspaceId, UUID.randomUUID(), "Chỉ mục", "Nội dung", "QUESTION",
                false, "OPEN", Instant.now())));
    }

    @Test
    void shouldAskTheAssistantAsTheCommenterWhenTheCommentNamesIt() {
        // Act
        var reply = service.addReply(workspaceId, discussionId, asker,
                new CreateReplyRequest("@AI chỉ mục là gì?", null));

        // Assert
        List<AiMentionEvent> mentions = publishedMentions();
        assertEquals(1, mentions.size());
        assertEquals(asker, mentions.get(0).asker());
        assertEquals(reply.id(), mentions.get(0).triggerReplyId());
    }

    @Test
    void shouldNotAskTheAssistantForAnAddressThatOnlyContainsTheHandle() {
        // Act
        service.addReply(workspaceId, discussionId, asker,
                new CreateReplyRequest("Gửi tài liệu cho x@ai.edu.vn nhé", null));

        // Assert
        assertTrue(publishedMentions().isEmpty());
    }

    private List<AiMentionEvent> publishedMentions() {
        ArgumentCaptor<Object> captor = ArgumentCaptor.forClass(Object.class);
        verify(events, atLeastOnce()).publishEvent(captor.capture());
        return captor.getAllValues().stream()
                .filter(AiMentionEvent.class::isInstance)
                .map(AiMentionEvent.class::cast)
                .toList();
    }
}
