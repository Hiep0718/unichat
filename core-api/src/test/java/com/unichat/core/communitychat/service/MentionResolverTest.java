package com.unichat.core.communitychat.service;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import com.unichat.core.user.domain.SystemRole;
import com.unichat.core.user.domain.User;
import com.unichat.core.user.domain.UserRepository;
import com.unichat.core.user.domain.UserStatus;
import com.unichat.core.workspace.domain.WorkspaceMember;
import com.unichat.core.workspace.domain.WorkspaceMemberRepository;
import com.unichat.core.workspace.domain.WorkspaceMemberStatus;
import com.unichat.core.workspace.domain.WorkspaceRole;

class MentionResolverTest {

    private WorkspaceMemberRepository memberRepository;
    private UserRepository userRepository;
    private MentionResolver resolver;

    private final UUID workspaceId = UUID.randomUUID();
    private final UUID hungId = UUID.randomUUID();
    private final UUID anId = UUID.randomUUID();

    @BeforeEach
    void setUp() {
        memberRepository = mock(WorkspaceMemberRepository.class);
        userRepository = mock(UserRepository.class);
        resolver = new MentionResolver(memberRepository, userRepository);
    }

    /** Two active members: hung and an. */
    private void givenTwoMembers() {
        when(memberRepository.findByWorkspaceIdAndStatus(workspaceId, WorkspaceMemberStatus.ACTIVE))
                .thenReturn(List.of(
                        new WorkspaceMember(workspaceId, hungId, WorkspaceRole.EDITOR,
                                WorkspaceMemberStatus.ACTIVE, hungId),
                        new WorkspaceMember(workspaceId, anId, WorkspaceRole.VIEWER,
                                WorkspaceMemberStatus.ACTIVE, anId)));
        when(userRepository.findAllById(any())).thenReturn(List.of(
                user(hungId, "hung@student.iuh.edu.vn"),
                user(anId, "an@student.iuh.edu.vn")));
    }

    private static User user(UUID id, String email) {
        return new User(id, email, "hash", SystemRole.USER, UserStatus.ACTIVE, Instant.now());
    }

    @Test
    void shouldResolveAMentionedMember() {
        // Arrange
        givenTwoMembers();

        // Act
        List<UUID> mentioned = resolver.resolve(workspaceId, "Nhờ @an xem giúp mình", hungId);

        // Assert
        assertEquals(List.of(anId), mentioned);
    }

    @Test
    void shouldNotNotifyTheAuthorWhoMentionedThemselves() {
        // Arrange
        givenTwoMembers();

        // Act
        List<UUID> mentioned = resolver.resolve(workspaceId, "@hung tự nhắc mình", hungId);

        // Assert
        assertTrue(mentioned.isEmpty());
    }

    @Test
    void shouldIgnoreAHandleThatBelongsToNoMember() {
        // Arrange — a mention of someone outside the group must not notify
        // anyone, and must not leak that the handle exists elsewhere.
        givenTwoMembers();

        // Act
        List<UUID> mentioned = resolver.resolve(workspaceId, "Hỏi @nguoila giúp", hungId);

        // Assert
        assertTrue(mentioned.isEmpty());
    }

    @Test
    void shouldNotQueryMembersWhenTheTextHasNoMention() {
        // Act
        List<UUID> mentioned = resolver.resolve(workspaceId, "Không nhắc ai cả", hungId);

        // Assert
        assertTrue(mentioned.isEmpty());
        verify(memberRepository, never())
                .findByWorkspaceIdAndStatus(eq(workspaceId), any());
    }

    @Test
    void shouldListMentionableMembersSortedByHandle() {
        // Arrange
        givenTwoMembers();

        // Act
        var members = resolver.listMentionable(workspaceId);

        // Assert — handles only, no email domain or role.
        assertEquals(List.of("an", "hung"), members.stream().map(m -> m.handle()).toList());
    }
}
