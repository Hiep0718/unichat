package com.unichat.core.user.service;

import java.util.Comparator;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.unichat.core.common.error.NotFoundError;
import com.unichat.core.communitychat.domain.DiscussionReplyRepository;
import com.unichat.core.communitychat.domain.DiscussionRepository;
import com.unichat.core.communitychat.service.MentionResolver;
import com.unichat.core.document.domain.DocumentRepository;
import com.unichat.core.user.api.MemberProfile;
import com.unichat.core.user.domain.User;
import com.unichat.core.user.domain.UserRepository;
import com.unichat.core.workspace.domain.Workspace;
import com.unichat.core.workspace.domain.WorkspaceMember;
import com.unichat.core.workspace.domain.WorkspaceMemberRepository;
import com.unichat.core.workspace.domain.WorkspaceMemberStatus;
import com.unichat.core.workspace.domain.WorkspaceRepository;

/**
 * What one member may see about another.
 *
 * <p>Everything is scoped to the groups the two people share. Listing all of
 * someone's groups would tell a viewer where that person works and studies
 * beyond anything the viewer is part of, so the same rule Work Chat uses to
 * decide who may be messaged decides what a profile shows.
 *
 * <p>A member with no group in common is not found, rather than found and
 * empty: the two answers are the same to anyone who should not be looking.
 */
@Service
@Transactional(readOnly = true)
public class MemberProfileService {

    private final UserRepository userRepository;
    private final WorkspaceMemberRepository memberRepository;
    private final WorkspaceRepository workspaceRepository;
    private final DocumentRepository documentRepository;
    private final DiscussionRepository discussionRepository;
    private final DiscussionReplyRepository replyRepository;

    public MemberProfileService(UserRepository userRepository,
                                WorkspaceMemberRepository memberRepository,
                                WorkspaceRepository workspaceRepository,
                                DocumentRepository documentRepository,
                                DiscussionRepository discussionRepository,
                                DiscussionReplyRepository replyRepository) {
        this.userRepository = userRepository;
        this.memberRepository = memberRepository;
        this.workspaceRepository = workspaceRepository;
        this.documentRepository = documentRepository;
        this.discussionRepository = discussionRepository;
        this.replyRepository = replyRepository;
    }

    /**
     * Builds the profile of {@code subjectId} as {@code viewerId} may see it.
     *
     * @throws NotFoundError when the member does not exist, or shares no group
     *                       with the viewer
     */
    public MemberProfile profileOf(UUID viewerId, UUID subjectId) {
        User subject = userRepository.findById(subjectId)
                .orElseThrow(() -> new NotFoundError("Người dùng không tồn tại"));

        boolean self = viewerId.equals(subjectId);
        List<WorkspaceMember> visible = visibleMemberships(viewerId, subjectId, self);

        if (visible.isEmpty() && !self) {
            throw new NotFoundError("Người dùng không tồn tại");
        }

        List<UUID> workspaceIds = visible.stream()
                .map(WorkspaceMember::getWorkspaceId)
                .distinct()
                .toList();

        return new MemberProfile(
                subject.getId(),
                subject.getDisplayName(),
                MentionResolver.handleOf(subject),
                subject.hasAvatarImage(),
                subject.getAvatarColor() == null ? null : subject.getAvatarColor().key(),
                subject.getCreatedAt(),
                sharedGroups(visible),
                contributions(subjectId, workspaceIds),
                !self && !workspaceIds.isEmpty(),
                self);
    }

    /**
     * The subject's memberships the viewer is entitled to see: their own when
     * looking at themselves, otherwise only those in groups both are in.
     */
    private List<WorkspaceMember> visibleMemberships(UUID viewerId, UUID subjectId, boolean self) {
        List<WorkspaceMember> subjectMemberships =
                memberRepository.findByUserIdAndStatus(subjectId, WorkspaceMemberStatus.ACTIVE);
        if (self) {
            return subjectMemberships;
        }

        Set<UUID> viewerWorkspaces =
                memberRepository.findByUserIdAndStatus(viewerId, WorkspaceMemberStatus.ACTIVE)
                        .stream()
                        .map(WorkspaceMember::getWorkspaceId)
                        .collect(Collectors.toSet());

        return subjectMemberships.stream()
                .filter(membership -> viewerWorkspaces.contains(membership.getWorkspaceId()))
                .toList();
    }

    /** Names each shared group and the subject's role in it, owners first. */
    private List<MemberProfile.SharedGroup> sharedGroups(List<WorkspaceMember> memberships) {
        if (memberships.isEmpty()) {
            return List.of();
        }
        Map<UUID, String> names = workspaceRepository
                .findAllById(memberships.stream().map(WorkspaceMember::getWorkspaceId).toList())
                .stream()
                .collect(Collectors.toMap(Workspace::getId, Workspace::getName));

        return memberships.stream()
                .map(membership -> new MemberProfile.SharedGroup(
                        membership.getWorkspaceId(),
                        names.getOrDefault(membership.getWorkspaceId(), "Nhóm"),
                        membership.getRole() == null ? "VIEWER" : membership.getRole().name()))
                // Owning a group is the fact worth seeing first.
                .sorted(Comparator.comparingInt(MemberProfileService::roleRank)
                        .thenComparing(MemberProfile.SharedGroup::name))
                .toList();
    }

    private static int roleRank(MemberProfile.SharedGroup group) {
        return switch (group.role()) {
            case "OWNER" -> 0;
            case "EDITOR" -> 1;
            default -> 2;
        };
    }

    private MemberProfile.Contributions contributions(UUID subjectId, List<UUID> workspaceIds) {
        if (workspaceIds.isEmpty()) {
            return MemberProfile.Contributions.none();
        }
        return new MemberProfile.Contributions(
                documentRepository.countContributedBy(subjectId, workspaceIds),
                documentRepository.countApprovedFrom(subjectId, workspaceIds),
                discussionRepository.countPostsBy(subjectId, workspaceIds),
                replyRepository.countRepliesBy(subjectId, workspaceIds),
                discussionRepository.countAcceptedAnswersBy(subjectId, workspaceIds));
    }
}
