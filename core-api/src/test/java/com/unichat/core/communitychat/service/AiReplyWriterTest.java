package com.unichat.core.communitychat.service;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
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

import com.unichat.core.chat.service.ChatActor;
import com.unichat.core.communitychat.domain.AiMentionEvent;
import com.unichat.core.communitychat.domain.Discussion;
import com.unichat.core.communitychat.domain.DiscussionReply;
import com.unichat.core.communitychat.domain.DiscussionReplyRepository;
import com.unichat.core.communitychat.domain.DiscussionRepository;
import com.unichat.core.communitychat.domain.ReplyCitation;
import com.unichat.core.workspace.domain.WorkspaceMember;
import com.unichat.core.workspace.domain.WorkspaceMemberRepository;
import com.unichat.core.workspace.domain.WorkspaceMemberStatus;
import com.unichat.core.workspace.domain.WorkspaceRole;

/**
 * The answer lands under the asking comment only while the thread and the
 * asker's access are still what they were when the question was asked.
 */
class AiReplyWriterTest {

    private static final Instant NOW = Instant.parse("2026-11-19T08:00:00Z");

    private final UUID workspaceId = UUID.randomUUID();
    private final UUID discussionId = UUID.randomUUID();
    private final UUID triggerReplyId = UUID.randomUUID();
    private final ChatActor asker = new ChatActor(UUID.randomUUID(), UUID.randomUUID(), 1L);
    private final AiMentionEvent event = new AiMentionEvent(workspaceId, discussionId, triggerReplyId,
            "Chỉ mục trong CSDL", "@AI chỉ mục là gì?", asker);
    private final UUID traceId = UUID.randomUUID();
    private final AiMentionAnswer answer = new AiMentionAnswer("Chỉ mục giúp truy vấn nhanh hơn [1].",
            List.of(new ReplyCitation("1", UUID.randomUUID().toString(), "csdl.pdf", "trang 12", "B-Tree")),
            traceId);

    private DiscussionRepository discussionRepository;
    private DiscussionReplyRepository replyRepository;
    private WorkspaceMemberRepository memberRepository;
    private AiReplyWriter writer;
    private Discussion discussion;

    @BeforeEach
    void setUp() {
        discussionRepository = mock(DiscussionRepository.class);
        replyRepository = mock(DiscussionReplyRepository.class);
        memberRepository = mock(WorkspaceMemberRepository.class);
        writer = new AiReplyWriter(discussionRepository, replyRepository, memberRepository,
                Clock.fixed(NOW, ZoneOffset.UTC));
        discussion = new Discussion(discussionId, workspaceId, asker.userId(), "Chỉ mục trong CSDL",
                "Nội dung", "QUESTION", false, "OPEN", NOW.minusSeconds(600));
        when(discussionRepository.findById(discussionId)).thenReturn(Optional.of(discussion));
        when(replyRepository.existsById(triggerReplyId)).thenReturn(true);
        when(memberRepository.findByWorkspaceIdAndUserIdAndStatus(workspaceId, asker.userId(),
                WorkspaceMemberStatus.ACTIVE)).thenReturn(Optional.of(new WorkspaceMember(workspaceId,
                asker.userId(), WorkspaceRole.VIEWER, WorkspaceMemberStatus.ACTIVE, asker.userId())));
    }

    @Test
    void shouldPostAsTheAssistantUnderTheAskingComment() {
        // Act
        boolean posted = writer.post(event, answer);

        // Assert
        assertTrue(posted);
        DiscussionReply reply = savedReply();
        assertEquals(AiReplyWriter.ASSISTANT_USER_ID, reply.getAuthorId());
        assertTrue(reply.isAiAnswer());
        assertEquals(triggerReplyId, reply.getParentReplyId());
        assertEquals(answer.body(), reply.getBody());
        assertEquals(answer.citations(), reply.getCitations());
        assertEquals(traceId, reply.getRetrievalTraceId());
    }

    @Test
    void shouldCountTheAnswerOnTheThread() {
        // Act
        writer.post(event, answer);

        // Assert
        assertEquals(1, discussion.getReplyCount());
        assertEquals(NOW, discussion.getUpdatedAt());
        verify(discussionRepository).save(discussion);
    }

    @Test
    void shouldPostNothingWhenTheAskerLeftTheGroupMeanwhile() {
        // Arrange
        when(memberRepository.findByWorkspaceIdAndUserIdAndStatus(workspaceId, asker.userId(),
                WorkspaceMemberStatus.ACTIVE)).thenReturn(Optional.empty());

        // Act & Assert
        assertFalse(writer.post(event, answer));
        verify(replyRepository, never()).save(any());
    }

    @Test
    void shouldPostNothingWhenThePostWasDeletedMeanwhile() {
        // Arrange
        discussion.markDeleted(NOW);

        // Act & Assert
        assertFalse(writer.post(event, answer));
        verify(replyRepository, never()).save(any());
    }

    @Test
    void shouldPostNothingWhenTheAskingCommentIsGone() {
        // Arrange
        when(replyRepository.existsById(triggerReplyId)).thenReturn(false);

        // Act & Assert
        assertFalse(writer.post(event, answer));
        verify(replyRepository, never()).save(any());
    }

    @Test
    void shouldPostNothingWhenThePostNowBelongsToAnotherGroup() {
        // Arrange
        when(discussionRepository.findById(discussionId)).thenReturn(Optional.of(new Discussion(
                discussionId, UUID.randomUUID(), asker.userId(), "Khác", "Nội dung", "QUESTION",
                false, "OPEN", NOW)));

        // Act & Assert
        assertFalse(writer.post(event, answer));
        verify(replyRepository, never()).save(any());
    }

    private DiscussionReply savedReply() {
        ArgumentCaptor<DiscussionReply> captor = ArgumentCaptor.forClass(DiscussionReply.class);
        verify(replyRepository).save(captor.capture());
        return captor.getValue();
    }
}
