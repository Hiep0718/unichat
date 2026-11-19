package com.unichat.core.communitychat.service;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyList;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.context.ApplicationEventPublisher;

import com.unichat.core.communitychat.api.ReplyResponse;
import com.unichat.core.communitychat.domain.Discussion;
import com.unichat.core.communitychat.domain.DiscussionReply;
import com.unichat.core.communitychat.domain.DiscussionReplyRepository;
import com.unichat.core.communitychat.domain.DiscussionRepository;
import com.unichat.core.user.domain.AvatarColor;
import com.unichat.core.user.domain.SystemRole;
import com.unichat.core.user.domain.User;
import com.unichat.core.user.domain.UserRepository;
import com.unichat.core.user.domain.UserStatus;
import com.unichat.core.workspace.domain.WorkspaceMember;
import com.unichat.core.workspace.domain.WorkspaceMemberRepository;
import com.unichat.core.workspace.domain.WorkspaceMemberStatus;
import com.unichat.core.workspace.domain.WorkspaceRepository;
import com.unichat.core.workspace.domain.WorkspaceRole;

/**
 * Replies carry what a reader needs to draw each author's face.
 *
 * <p>They used to carry only a name, with {@code authorAvatar} always null, so
 * every comment showed a grey initial even for people who had uploaded a
 * picture or chosen a colour.
 */
class DiscussionReplyAuthorTest {

    private final UUID workspaceId = UUID.randomUUID();
    private final UUID readerId = UUID.randomUUID();
    private final UUID discussionId = UUID.randomUUID();

    private DiscussionReplyRepository replyRepository;
    private UserRepository userRepository;
    private DiscussionService service;

    @BeforeEach
    void setUp() {
        DiscussionRepository discussionRepository = mock(DiscussionRepository.class);
        WorkspaceMemberRepository memberRepository = mock(WorkspaceMemberRepository.class);
        ReactionService reactionService = mock(ReactionService.class);
        replyRepository = mock(DiscussionReplyRepository.class);
        userRepository = mock(UserRepository.class);

        service = new DiscussionService(discussionRepository, replyRepository, memberRepository,
                userRepository, mock(WorkspaceRepository.class), mock(ApplicationEventPublisher.class),
                mock(PostAttachmentService.class), mock(MentionResolver.class), reactionService);

        when(memberRepository.findByWorkspaceIdAndUserIdAndStatus(
                workspaceId, readerId, WorkspaceMemberStatus.ACTIVE))
                .thenReturn(Optional.of(new WorkspaceMember(workspaceId, readerId,
                        WorkspaceRole.VIEWER, WorkspaceMemberStatus.ACTIVE, readerId)));
        when(discussionRepository.findById(discussionId)).thenReturn(Optional.of(new Discussion(
                discussionId, workspaceId, readerId, "Index", "Nội dung", "QUESTION", false, "OPEN", Instant.now())));
        when(reactionService.summariseAll(anyString(), anyList(), any())).thenReturn(Map.of());
    }

    private User person(String name) {
        User user = new User(UUID.randomUUID(), name + "@example.test", "hash",
                SystemRole.USER, UserStatus.ACTIVE, Instant.now());
        user.rename(name);
        return user;
    }

    private DiscussionReply replyBy(User author) {
        return new DiscussionReply(UUID.randomUUID(), discussionId, author.getId(), "Bình luận",
                null, false, Instant.now());
    }

    @Test
    void shouldTellTheReaderWhoHasAPictureAndWhichColourWasChosen() {
        // Arrange: one author with a picture, one with only a chosen colour.
        User withPicture = person("An");
        withPicture.replaceAvatar("avatars/an.jpg");
        User withColour = person("Bình");
        withColour.setAvatarColor(AvatarColor.TEAL);
        when(replyRepository.findByDiscussionIdOrderByCreatedAtAsc(discussionId))
                .thenReturn(List.of(replyBy(withPicture), replyBy(withColour)));
        when(userRepository.findAllById(anyList())).thenReturn(List.of(withPicture, withColour));

        // Act
        List<ReplyResponse> replies = service.getReplies(workspaceId, discussionId, readerId);

        // Assert
        assertTrue(replies.get(0).authorHasAvatar());
        assertNull(replies.get(0).authorAvatarColor());
        assertFalse(replies.get(1).authorHasAvatar());
        assertEquals("teal", replies.get(1).authorAvatarColor());
        assertEquals("Bình", replies.get(1).authorName());
    }

    @Test
    void shouldNeverExposeTheStorageKeyOfAPicture() {
        // Arrange: the key names where the file lives; the client fetches the
        // picture through the avatar endpoint instead.
        User withPicture = person("An");
        withPicture.replaceAvatar("avatars/an.jpg");
        when(replyRepository.findByDiscussionIdOrderByCreatedAtAsc(discussionId))
                .thenReturn(List.of(replyBy(withPicture)));
        when(userRepository.findAllById(anyList())).thenReturn(List.of(withPicture));

        // Act
        ReplyResponse reply = service.getReplies(workspaceId, discussionId, readerId).get(0);

        // Assert
        assertNull(reply.authorAvatar());
    }

    @Test
    void shouldFallBackToAPlaceholderForAnAuthorWhoNoLongerExists() {
        // Arrange
        User gone = person("Đã xóa");
        when(replyRepository.findByDiscussionIdOrderByCreatedAtAsc(discussionId))
                .thenReturn(List.of(replyBy(gone)));
        when(userRepository.findAllById(anyList())).thenReturn(List.of());

        // Act
        ReplyResponse reply = service.getReplies(workspaceId, discussionId, readerId).get(0);

        // Assert
        assertEquals("Người dùng", reply.authorName());
        assertFalse(reply.authorHasAvatar());
    }
}
