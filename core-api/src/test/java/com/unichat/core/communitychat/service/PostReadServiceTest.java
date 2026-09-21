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

import java.time.Clock;
import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import com.unichat.core.common.error.AuthorizationError;
import com.unichat.core.communitychat.domain.Discussion;
import com.unichat.core.communitychat.domain.DiscussionRepository;
import com.unichat.core.communitychat.domain.PostRead;
import com.unichat.core.communitychat.domain.PostReadRepository;
import com.unichat.core.user.domain.SystemRole;
import com.unichat.core.user.domain.User;
import com.unichat.core.user.domain.UserRepository;
import com.unichat.core.user.domain.UserStatus;
import com.unichat.core.workspace.domain.WorkspaceMember;
import com.unichat.core.workspace.domain.WorkspaceMemberRepository;
import com.unichat.core.workspace.domain.WorkspaceMemberStatus;
import com.unichat.core.workspace.domain.WorkspaceRole;

class PostReadServiceTest {

    private PostReadRepository readRepository;
    private DiscussionRepository discussionRepository;
    private WorkspaceMemberRepository memberRepository;
    private UserRepository userRepository;
    private PostReadService service;

    private final UUID workspaceId = UUID.randomUUID();
    private final UUID discussionId = UUID.randomUUID();
    private final UUID teacherId = UUID.randomUUID();
    private final UUID studentId = UUID.randomUUID();

    @BeforeEach
    void setUp() {
        readRepository = mock(PostReadRepository.class);
        discussionRepository = mock(DiscussionRepository.class);
        memberRepository = mock(WorkspaceMemberRepository.class);
        userRepository = mock(UserRepository.class);
        service = new PostReadService(readRepository, discussionRepository,
                memberRepository, userRepository, Clock.systemUTC());

        when(discussionRepository.findById(discussionId)).thenReturn(Optional.of(
                new Discussion(discussionId, workspaceId, teacherId, "Thông báo",
                        "body", "ANNOUNCEMENT", true, "OPEN", Instant.now())));
    }

    private void givenMember(UUID userId, WorkspaceRole role) {
        when(memberRepository.findByWorkspaceIdAndUserIdAndStatus(workspaceId, userId, WorkspaceMemberStatus.ACTIVE))
                .thenReturn(Optional.of(new WorkspaceMember(workspaceId, userId, role,
                        WorkspaceMemberStatus.ACTIVE, userId)));
    }

    private void givenGroupOfTwo() {
        when(memberRepository.findByWorkspaceIdAndStatus(workspaceId, WorkspaceMemberStatus.ACTIVE))
                .thenReturn(List.of(
                        new WorkspaceMember(workspaceId, teacherId, WorkspaceRole.OWNER,
                                WorkspaceMemberStatus.ACTIVE, teacherId),
                        new WorkspaceMember(workspaceId, studentId, WorkspaceRole.VIEWER,
                                WorkspaceMemberStatus.ACTIVE, studentId)));
        when(userRepository.findAllById(any())).thenReturn(List.of(
                new User(teacherId, "trung@iuh.edu.vn", "h", SystemRole.USER, UserStatus.ACTIVE, Instant.now()),
                new User(studentId, "an@student.iuh.edu.vn", "h", SystemRole.USER, UserStatus.ACTIVE, Instant.now())));
    }

    @Test
    void shouldRecordThatAMemberOpenedThePost() {
        // Arrange
        givenMember(studentId, WorkspaceRole.VIEWER);
        when(readRepository.existsByIdDiscussionIdAndIdUserId(discussionId, studentId)).thenReturn(false);

        // Act
        service.markRead(workspaceId, discussionId, studentId);

        // Assert
        verify(readRepository).save(any(PostRead.class));
    }

    @Test
    void shouldKeepTheFirstReadTimestampWhenOpenedAgain() {
        // Arrange — re-reading must not move the timestamp, otherwise "seen at"
        // reports the latest visit rather than when they first saw it.
        givenMember(studentId, WorkspaceRole.VIEWER);
        when(readRepository.existsByIdDiscussionIdAndIdUserId(discussionId, studentId)).thenReturn(true);

        // Act
        service.markRead(workspaceId, discussionId, studentId);

        // Assert
        verify(readRepository, never()).save(any(PostRead.class));
    }

    @Test
    void shouldTellAnOwnerWhoHasNotReadTheAnnouncement() {
        // Arrange
        givenMember(teacherId, WorkspaceRole.OWNER);
        givenGroupOfTwo();
        when(readRepository.findByIdDiscussionIdOrderByReadAtDesc(discussionId))
                .thenReturn(List.of(new PostRead(discussionId, teacherId, Instant.now())));

        // Act
        var summary = service.summarise(workspaceId, discussionId, teacherId);

        // Assert
        assertEquals(1, summary.readCount());
        assertEquals(2, summary.memberCount());
        assertTrue(summary.hasRead());
        assertEquals(List.of("an"), summary.notYetRead().stream().map(r -> r.handle()).toList());
    }

    @Test
    void shouldHideReaderNamesFromOrdinaryMembers() {
        // Arrange — a member may see how many opened it, but not audit who.
        givenMember(studentId, WorkspaceRole.VIEWER);
        givenGroupOfTwo();
        when(readRepository.findByIdDiscussionIdOrderByReadAtDesc(discussionId))
                .thenReturn(List.of(new PostRead(discussionId, teacherId, Instant.now())));

        // Act
        var summary = service.summarise(workspaceId, discussionId, studentId);

        // Assert
        assertEquals(1, summary.readCount());
        assertFalse(summary.hasRead());
        assertTrue(summary.readers().isEmpty());
        assertTrue(summary.notYetRead().isEmpty());
    }

    @Test
    void shouldRejectAReadReceiptFromSomeoneOutsideTheGroup() {
        // Arrange
        UUID outsider = UUID.randomUUID();
        when(memberRepository.findByWorkspaceIdAndUserIdAndStatus(workspaceId, outsider, WorkspaceMemberStatus.ACTIVE))
                .thenReturn(Optional.empty());

        // Act and Assert
        assertThrows(AuthorizationError.class,
                () -> service.markRead(workspaceId, discussionId, outsider));
    }
}
