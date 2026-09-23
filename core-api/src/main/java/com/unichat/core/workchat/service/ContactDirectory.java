package com.unichat.core.workchat.service;

import java.util.Comparator;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.unichat.core.user.domain.UserRepository;
import com.unichat.core.workchat.api.ContactSummary;
import com.unichat.core.workspace.domain.Workspace;
import com.unichat.core.workspace.domain.WorkspaceMember;
import com.unichat.core.workspace.domain.WorkspaceMemberRepository;
import com.unichat.core.workspace.domain.WorkspaceMemberStatus;
import com.unichat.core.workspace.domain.WorkspaceRepository;

/**
 * Decides who a person is allowed to message.
 *
 * <p>The rule is sharing a group. On a campus platform, making everyone
 * reachable by every stranger is a way to be harassed rather than a feature,
 * and a shared group is the existing relationship the product already models.
 *
 * <p>Kept apart from {@link DirectMessageService} so the rule has one home: the
 * service asks this, rather than each call site re-deriving who counts as a
 * contact.
 */
@Service
@Transactional(readOnly = true)
public class ContactDirectory {

    /** Excludes the assistant, which is not a person anyone can message. */
    private static final UUID ASSISTANT_USER_ID =
            UUID.fromString("00000000-0000-0000-0000-0000000000a1");

    private final WorkspaceMemberRepository memberRepository;
    private final WorkspaceRepository workspaceRepository;
    private final UserRepository userRepository;

    public ContactDirectory(WorkspaceMemberRepository memberRepository,
                            WorkspaceRepository workspaceRepository,
                            UserRepository userRepository) {
        this.memberRepository = memberRepository;
        this.workspaceRepository = workspaceRepository;
        this.userRepository = userRepository;
    }

    /** Whether these two share at least one group, in both directions. */
    public boolean canMessage(UUID callerId, UUID otherUserId) {
        if (ASSISTANT_USER_ID.equals(otherUserId)) {
            return false;
        }
        Set<UUID> mine = Set.copyOf(activeWorkspaceIdsOf(callerId));
        return activeWorkspaceIdsOf(otherUserId).stream().anyMatch(mine::contains);
    }

    /**
     * Everyone the caller may start a conversation with, with one group they
     * share named so the caller can tell two people of the same name apart.
     */
    public List<ContactSummary> listContacts(UUID callerId) {
        List<UUID> myWorkspaceIds = activeWorkspaceIdsOf(callerId);
        if (myWorkspaceIds.isEmpty()) {
            return List.of();
        }

        Map<UUID, String> workspaceNames = workspaceRepository.findAllById(myWorkspaceIds).stream()
                .collect(Collectors.toMap(Workspace::getId, Workspace::getName));

        // First shared group wins as the label; listing every one of them would
        // crowd the row without helping anyone pick a person.
        Map<UUID, UUID> firstSharedGroup = myWorkspaceIds.stream()
                .flatMap(workspaceId -> memberRepository
                        .findByWorkspaceIdAndStatus(workspaceId, WorkspaceMemberStatus.ACTIVE)
                        .stream()
                        .map(member -> Map.entry(member.getUserId(), workspaceId)))
                .filter(entry -> !entry.getKey().equals(callerId))
                .filter(entry -> !ASSISTANT_USER_ID.equals(entry.getKey()))
                .collect(Collectors.toMap(
                        Map.Entry::getKey, Map.Entry::getValue, (first, second) -> first));

        return userRepository.findAllById(firstSharedGroup.keySet()).stream()
                .map(user -> new ContactSummary(
                        user.getId(),
                        user.getDisplayName(),
                        workspaceNames.getOrDefault(firstSharedGroup.get(user.getId()), "Nhóm")))
                .sorted(Comparator.comparing(ContactSummary::name))
                .toList();
    }

    private List<UUID> activeWorkspaceIdsOf(UUID userId) {
        return memberRepository.findByUserIdAndStatus(userId, WorkspaceMemberStatus.ACTIVE)
                .stream()
                .map(WorkspaceMember::getWorkspaceId)
                .toList();
    }
}
