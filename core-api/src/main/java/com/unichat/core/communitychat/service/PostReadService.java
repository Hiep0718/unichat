package com.unichat.core.communitychat.service;

import java.time.Clock;
import java.time.Instant;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.unichat.core.common.error.AuthorizationError;
import com.unichat.core.common.error.NotFoundError;
import com.unichat.core.communitychat.api.PostReadSummary;
import com.unichat.core.communitychat.domain.Discussion;
import com.unichat.core.communitychat.domain.DiscussionRepository;
import com.unichat.core.communitychat.domain.PostRead;
import com.unichat.core.communitychat.domain.PostReadRepository;
import com.unichat.core.user.domain.UserRepository;
import com.unichat.core.workspace.domain.WorkspaceMember;
import com.unichat.core.workspace.domain.WorkspaceMemberRepository;
import com.unichat.core.workspace.domain.WorkspaceMemberStatus;
import com.unichat.core.workspace.domain.WorkspaceRole;

/**
 * Tracks who has opened a post.
 *
 * <p>Exists for announcements: the author needs to know whether the group
 * actually saw it, which replies alone never tell them.
 */
@Service
@Transactional(readOnly = true)
public class PostReadService {

    private final PostReadRepository readRepository;
    private final DiscussionRepository discussionRepository;
    private final WorkspaceMemberRepository memberRepository;
    private final UserRepository userRepository;
    private final Clock clock;

    public PostReadService(PostReadRepository readRepository,
                           DiscussionRepository discussionRepository,
                           WorkspaceMemberRepository memberRepository,
                           UserRepository userRepository,
                           Clock clock) {
        this.readRepository = readRepository;
        this.discussionRepository = discussionRepository;
        this.memberRepository = memberRepository;
        this.userRepository = userRepository;
        this.clock = clock;
    }

    /**
     * Records that a member opened a post. Idempotent: the first read stands,
     * so the timestamp reflects when they actually saw it.
     */
    @Transactional
    public void markRead(UUID workspaceId, UUID discussionId, UUID userId) {
        requireMembership(workspaceId, userId);
        requirePostInWorkspace(workspaceId, discussionId);

        if (readRepository.existsByIdDiscussionIdAndIdUserId(discussionId, userId)) {
            return;
        }
        readRepository.save(new PostRead(discussionId, userId, Instant.now(clock)));
    }

    /**
     * Who has opened a post. Names are included only for owners and editors.
     */
    public PostReadSummary summarise(UUID workspaceId, UUID discussionId, UUID userId) {
        WorkspaceMember member = requireMembership(workspaceId, userId);
        requirePostInWorkspace(workspaceId, discussionId);

        List<WorkspaceMember> members = memberRepository
                .findByWorkspaceIdAndStatus(workspaceId, WorkspaceMemberStatus.ACTIVE);
        List<PostRead> reads = readRepository.findByIdDiscussionIdOrderByReadAtDesc(discussionId);

        boolean hasRead = reads.stream().anyMatch(r -> r.getUserId().equals(userId));
        boolean canSeeNames = WorkspaceRole.OWNER.equals(member.getRole())
                || WorkspaceRole.EDITOR.equals(member.getRole());

        if (!canSeeNames) {
            return new PostReadSummary(reads.size(), members.size(), hasRead, List.of(), List.of());
        }

        Map<UUID, Instant> readAtByUser = new HashMap<>();
        reads.forEach(r -> readAtByUser.put(r.getUserId(), r.getReadAt()));

        Map<UUID, String> handles = new HashMap<>();
        userRepository.findAllById(members.stream().map(WorkspaceMember::getUserId).toList())
                .forEach(user -> handles.put(user.getId(), MentionResolver.handleOf(user)));

        List<PostReadSummary.Reader> readers = members.stream()
                .filter(m -> readAtByUser.containsKey(m.getUserId()))
                .map(m -> new PostReadSummary.Reader(
                        m.getUserId(),
                        handles.getOrDefault(m.getUserId(), "?"),
                        readAtByUser.get(m.getUserId())))
                .sorted((a, b) -> b.readAt().compareTo(a.readAt()))
                .toList();

        List<PostReadSummary.Reader> pending = members.stream()
                .filter(m -> !readAtByUser.containsKey(m.getUserId()))
                .map(m -> new PostReadSummary.Reader(
                        m.getUserId(), handles.getOrDefault(m.getUserId(), "?"), null))
                .sorted((a, b) -> a.handle().compareTo(b.handle()))
                .toList();

        return new PostReadSummary(readers.size(), members.size(), hasRead, readers, pending);
    }

    /** Read counts for a page of posts, batched. */
    public Map<UUID, Long> countsFor(List<UUID> discussionIds) {
        if (discussionIds.isEmpty()) {
            return Map.of();
        }
        Map<UUID, Long> counts = new HashMap<>();
        for (Object[] row : readRepository.countByDiscussionIds(discussionIds)) {
            counts.put((UUID) row[0], ((Number) row[1]).longValue());
        }
        return counts;
    }

    /* ---------- Private helpers ---------- */

    private WorkspaceMember requireMembership(UUID workspaceId, UUID userId) {
        return memberRepository
                .findByWorkspaceIdAndUserIdAndStatus(workspaceId, userId, WorkspaceMemberStatus.ACTIVE)
                .orElseThrow(() -> new AuthorizationError("Bạn không phải thành viên của nhóm này"));
    }

    private Discussion requirePostInWorkspace(UUID workspaceId, UUID discussionId) {
        Discussion discussion = discussionRepository.findById(discussionId)
                .orElseThrow(() -> new NotFoundError("Bài viết không tồn tại"));
        if (!discussion.getWorkspaceId().equals(workspaceId)) {
            throw new AuthorizationError("Bài viết không thuộc Workspace này");
        }
        return discussion;
    }
}
