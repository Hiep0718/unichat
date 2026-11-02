package com.unichat.core.workspace.service;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.anyList;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import com.unichat.core.user.domain.AvatarColor;
import com.unichat.core.user.domain.SystemRole;
import com.unichat.core.user.domain.User;
import com.unichat.core.user.domain.UserRepository;
import com.unichat.core.user.domain.UserStatus;
import com.unichat.core.workspace.api.WorkspaceMemberResponse;
import com.unichat.core.workspace.domain.Workspace;
import com.unichat.core.workspace.domain.WorkspaceMember;
import com.unichat.core.workspace.domain.WorkspaceMemberRepository;
import com.unichat.core.workspace.domain.WorkspaceMemberStatus;
import com.unichat.core.workspace.domain.WorkspaceRepository;
import com.unichat.core.workspace.domain.WorkspaceRole;
import com.unichat.core.workspace.domain.WorkspaceVisibility;

/**
 * The member list carries the identity each row is drawn with.
 *
 * <p>The group's Thành viên tab shows a picture or a coloured letter beside
 * every address, so the list has to report which of the two applies. It must
 * cost no extra query: the users are already loaded to resolve the addresses.
 */
class WorkspaceMemberAvatarTest {

    private WorkspaceRepository workspaceRepository;
    private WorkspaceMemberRepository memberRepository;
    private UserRepository userRepository;
    private WorkspaceMemberService service;

    private final UUID ownerId = UUID.randomUUID();
    private final UUID workspaceId = UUID.randomUUID();

    @BeforeEach
    void setUp() {
        workspaceRepository = mock(WorkspaceRepository.class);
        memberRepository = mock(WorkspaceMemberRepository.class);
        userRepository = mock(UserRepository.class);
        service = new WorkspaceMemberService(workspaceRepository, memberRepository, userRepository);

        var workspace = new Workspace(workspaceId, ownerId, "Mongodb", "",
                WorkspaceVisibility.PUBLIC, false, Instant.now());
        when(workspaceRepository.findById(workspaceId)).thenReturn(Optional.of(workspace));
        when(memberRepository.findByWorkspaceIdAndUserIdAndStatus(
                workspaceId, ownerId, WorkspaceMemberStatus.ACTIVE))
                .thenReturn(Optional.of(new WorkspaceMember(workspaceId, ownerId,
                        WorkspaceRole.OWNER, WorkspaceMemberStatus.ACTIVE, ownerId)));
    }

    private User userWith(UUID id, String email) {
        return new User(id, email, "hash", SystemRole.USER, UserStatus.ACTIVE, Instant.now());
    }

    /** One active membership for the given user, listed to the owner. */
    private void givenOneMember(User user) {
        when(memberRepository.findByWorkspaceIdAndStatus(workspaceId, WorkspaceMemberStatus.ACTIVE))
                .thenReturn(List.of(new WorkspaceMember(workspaceId, user.getId(),
                        WorkspaceRole.VIEWER, WorkspaceMemberStatus.ACTIVE, ownerId)));
        when(userRepository.findAllById(anyList())).thenReturn(List.of(user));
    }

    @Test
    void shouldReportTheColourAMemberChose() {
        // Arrange
        var user = userWith(UUID.randomUUID(), "taolahieptqn122@gmail.com");
        user.setAvatarColor(AvatarColor.CLAY);
        givenOneMember(user);

        // Act
        List<WorkspaceMemberResponse> members = service.getMembers(ownerId, workspaceId);

        // Assert: the key, not the enum's name — the client's palette is keyed
        // by the lowercase form.
        assertEquals("clay", members.get(0).avatarColor());
    }

    @Test
    void shouldLeaveTheColourUnsetSoTheClientDerivesOne() {
        // Arrange: nobody picked a colour, which is not the same as picking one.
        var user = userWith(UUID.randomUUID(), "test01@gmail.com");
        givenOneMember(user);

        // Act
        List<WorkspaceMemberResponse> members = service.getMembers(ownerId, workspaceId);

        // Assert
        assertNull(members.get(0).avatarColor());
    }

    @Test
    void shouldSayWhenAMemberHasNoPictureToFetch() {
        // Arrange
        var user = userWith(UUID.randomUUID(), "test01@gmail.com");
        givenOneMember(user);

        // Act
        List<WorkspaceMemberResponse> members = service.getMembers(ownerId, workspaceId);

        // Assert: false means draw the letter, so the client makes no request
        // for a picture that is not there.
        assertFalse(members.get(0).hasAvatar());
    }

    @Test
    void shouldCarryTheNameTheLetterIsDrawnFrom() {
        // Arrange
        var user = userWith(UUID.randomUUID(), "hungdz1372004@gmail.com");
        givenOneMember(user);

        // Act
        List<WorkspaceMemberResponse> members = service.getMembers(ownerId, workspaceId);

        // Assert
        assertEquals(user.getDisplayName(), members.get(0).displayName());
        assertTrue(members.get(0).displayName() != null && !members.get(0).displayName().isBlank());
    }

    @Test
    void shouldReadTheUsersOnceForTheWholeList() {
        // Arrange
        var user = userWith(UUID.randomUUID(), "test01@gmail.com");
        givenOneMember(user);

        // Act
        service.getMembers(ownerId, workspaceId);

        // Assert: the addresses already required these rows, so the avatar
        // fields must not add a second read.
        verify(userRepository, times(1)).findAllById(anyList());
    }

    @Test
    void shouldStillListAMembershipWhoseUserRowCouldNotBeRead() {
        // Arrange: a membership that exists is a fact the owner should see,
        // even when the user row behind it cannot be resolved.
        var missingId = UUID.randomUUID();
        when(memberRepository.findByWorkspaceIdAndStatus(workspaceId, WorkspaceMemberStatus.ACTIVE))
                .thenReturn(List.of(new WorkspaceMember(workspaceId, missingId,
                        WorkspaceRole.VIEWER, WorkspaceMemberStatus.ACTIVE, ownerId)));
        when(userRepository.findAllById(anyList())).thenReturn(List.of());

        // Act
        List<WorkspaceMemberResponse> members = service.getMembers(ownerId, workspaceId);

        // Assert
        assertEquals(1, members.size());
        assertEquals("", members.get(0).email());
        assertNull(members.get(0).displayName());
        assertFalse(members.get(0).hasAvatar());
    }
}
