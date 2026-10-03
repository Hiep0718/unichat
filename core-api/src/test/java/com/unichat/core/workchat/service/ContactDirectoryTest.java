package com.unichat.core.workchat.service;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.anyIterable;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import java.util.List;
import java.util.UUID;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import com.unichat.core.user.domain.User;
import com.unichat.core.user.domain.UserRepository;
import com.unichat.core.workchat.api.ContactSummary;
import com.unichat.core.workspace.domain.Workspace;
import com.unichat.core.workspace.domain.WorkspaceMember;
import com.unichat.core.workspace.domain.WorkspaceMemberRepository;
import com.unichat.core.workspace.domain.WorkspaceMemberStatus;
import com.unichat.core.workspace.domain.WorkspaceRepository;

/**
 * Sharing a group is what grants the right to message someone: a stranger with
 * no group in common cannot be reached at all.
 */
class ContactDirectoryTest {

    private WorkspaceMemberRepository memberRepository;
    private WorkspaceRepository workspaceRepository;
    private UserRepository userRepository;
    private ContactDirectory directory;

    private final UUID alice = UUID.randomUUID();
    private final UUID bob = UUID.randomUUID();
    private final UUID stranger = UUID.randomUUID();
    private final UUID assistant = UUID.fromString("00000000-0000-0000-0000-0000000000a1");
    private final UUID sharedGroup = UUID.randomUUID();
    private final UUID otherGroup = UUID.randomUUID();

    @BeforeEach
    void setUp() {
        memberRepository = mock(WorkspaceMemberRepository.class);
        workspaceRepository = mock(WorkspaceRepository.class);
        userRepository = mock(UserRepository.class);
        directory = new ContactDirectory(memberRepository, workspaceRepository, userRepository);
    }

    @Test
    void shouldAllowMessagingSomeoneInTheSameGroup() {
        // Arrange
        givenMemberships(alice, sharedGroup);
        givenMemberships(bob, sharedGroup);

        // Act and Assert
        assertTrue(directory.canMessage(alice, bob));
    }

    @Test
    void shouldRefuseMessagingSomeoneWithNoGroupInCommon() {
        // Arrange
        givenMemberships(alice, sharedGroup);
        givenMemberships(stranger, otherGroup);

        // Act and Assert
        assertFalse(directory.canMessage(alice, stranger));
    }

    @Test
    void shouldRefuseMessagingTheAssistantWhichIsNotAPerson() {
        // Arrange: the system account is a member of nothing, but the rule is
        // stated explicitly rather than relying on that.
        givenMemberships(alice, sharedGroup);
        givenMemberships(assistant, sharedGroup);

        // Act and Assert
        assertFalse(directory.canMessage(alice, assistant));
    }

    @Test
    void shouldRefuseMessagingWhenTheCallerBelongsToNoGroup() {
        // Arrange
        givenMemberships(alice);
        givenMemberships(bob, sharedGroup);

        // Act and Assert
        assertFalse(directory.canMessage(alice, bob));
    }

    @Test
    void shouldListGroupMatesAndNameAGroupTheyShare() {
        // Arrange
        givenMemberships(alice, sharedGroup);
        givenGroupRoster(sharedGroup, alice, bob);
        givenWorkspaceNamed(sharedGroup, "Cơ sở dữ liệu");
        givenUsers(user(bob, "bob@example.com"));

        // Act
        List<ContactSummary> contacts = directory.listContacts(alice);

        // Assert
        assertEquals(1, contacts.size());
        assertEquals(bob, contacts.get(0).userId());
        assertEquals("bob", contacts.get(0).name());
        assertEquals("Cơ sở dữ liệu", contacts.get(0).sharedGroup());
    }

    @Test
    void shouldNotListTheCallerAsTheirOwnContact() {
        // Arrange
        givenMemberships(alice, sharedGroup);
        givenGroupRoster(sharedGroup, alice);
        givenWorkspaceNamed(sharedGroup, "Cơ sở dữ liệu");
        givenUsers();

        // Act
        List<ContactSummary> contacts = directory.listContacts(alice);

        // Assert
        assertTrue(contacts.isEmpty());
    }

    @Test
    void shouldNotOfferTheAssistantAsAContact() {
        // Arrange
        givenMemberships(alice, sharedGroup);
        givenGroupRoster(sharedGroup, alice, assistant);
        givenWorkspaceNamed(sharedGroup, "Cơ sở dữ liệu");
        givenUsers();

        // Act
        List<ContactSummary> contacts = directory.listContacts(alice);

        // Assert
        assertTrue(contacts.isEmpty());
    }

    @Test
    void shouldReturnNoContactsForSomeoneInNoGroup() {
        // Arrange
        givenMemberships(alice);

        // Act
        List<ContactSummary> contacts = directory.listContacts(alice);

        // Assert
        assertTrue(contacts.isEmpty());
    }

    /* ---------- Arrange helpers ---------- */

    private void givenMemberships(UUID userId, UUID... workspaceIds) {
        List<WorkspaceMember> members = java.util.Arrays.stream(workspaceIds)
                .map(workspaceId -> member(userId, workspaceId))
                .toList();
        when(memberRepository.findByUserIdAndStatus(userId, WorkspaceMemberStatus.ACTIVE))
                .thenReturn(members);
    }

    private void givenGroupRoster(UUID workspaceId, UUID... userIds) {
        List<WorkspaceMember> members = java.util.Arrays.stream(userIds)
                .map(userId -> member(userId, workspaceId))
                .toList();
        when(memberRepository.findByWorkspaceIdAndStatus(workspaceId, WorkspaceMemberStatus.ACTIVE))
                .thenReturn(members);
    }

    private void givenWorkspaceNamed(UUID workspaceId, String name) {
        Workspace workspace = mock(Workspace.class);
        when(workspace.getId()).thenReturn(workspaceId);
        when(workspace.getName()).thenReturn(name);
        when(workspaceRepository.findAllById(anyIterable())).thenReturn(List.of(workspace));
    }

    private void givenUsers(User... users) {
        when(userRepository.findAllById(anyIterable())).thenReturn(List.of(users));
    }

    private WorkspaceMember member(UUID userId, UUID workspaceId) {
        WorkspaceMember member = mock(WorkspaceMember.class);
        when(member.getUserId()).thenReturn(userId);
        when(member.getWorkspaceId()).thenReturn(workspaceId);
        return member;
    }

    private User user(UUID id, String email) {
        User user = mock(User.class);
        when(user.getId()).thenReturn(id);
        when(user.getEmail()).thenReturn(email);
        // Names come from the stored display name now, not from the email.
        when(user.getDisplayName()).thenReturn(email.split("@")[0]);
        return user;
    }
}
