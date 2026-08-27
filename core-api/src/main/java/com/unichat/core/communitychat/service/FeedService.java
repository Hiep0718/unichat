package com.unichat.core.communitychat.service;

import java.time.Duration;
import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.unichat.core.communitychat.api.FeedPostResponse;
import com.unichat.core.communitychat.domain.Bookmark;
import com.unichat.core.communitychat.domain.BookmarkRepository;
import com.unichat.core.communitychat.domain.Discussion;
import com.unichat.core.communitychat.domain.DiscussionRepository;
import com.unichat.core.communitychat.domain.Reaction;
import com.unichat.core.communitychat.domain.ReactionRepository;
import com.unichat.core.user.domain.UserRepository;
import com.unichat.core.workspace.domain.Workspace;
import com.unichat.core.workspace.domain.WorkspaceMember;
import com.unichat.core.workspace.domain.WorkspaceMemberRepository;
import com.unichat.core.workspace.domain.WorkspaceMemberStatus;
import com.unichat.core.workspace.domain.WorkspaceRepository;
import com.unichat.core.workspace.domain.WorkspaceVisibility;

/**
 * Service layer for the community feed, supporting search, tag filtering,
 * trending tags, bookmarks, and time-ranged TOP sorting.
 */
@Service
@Transactional(readOnly = true)
public class FeedService {

    private final DiscussionRepository discussionRepository;
    private final WorkspaceMemberRepository memberRepository;
    private final WorkspaceRepository workspaceRepository;
    private final UserRepository userRepository;
    private final ReactionRepository reactionRepository;
    private final BookmarkRepository bookmarkRepository;

    public FeedService(DiscussionRepository discussionRepository,
                       WorkspaceMemberRepository memberRepository,
                       WorkspaceRepository workspaceRepository,
                       UserRepository userRepository,
                       ReactionRepository reactionRepository,
                       BookmarkRepository bookmarkRepository) {
        this.discussionRepository = discussionRepository;
        this.memberRepository = memberRepository;
        this.workspaceRepository = workspaceRepository;
        this.userRepository = userRepository;
        this.reactionRepository = reactionRepository;
        this.bookmarkRepository = bookmarkRepository;
    }

    /**
     * Main feed query with search, tag, sort, scope, and time range.
     */
    public Page<FeedPostResponse> getFeed(UUID userId, String sort, String scope,
                                          String query, String tag, String range,
                                          int page, int size) {
        List<UUID> workspaceIds = resolveWorkspaceIds(userId, scope);
        if (workspaceIds.isEmpty()) {
            return Page.empty();
        }

        PageRequest pageRequest = buildPageRequest(sort, page, size);
        Page<Discussion> result = executeQuery(
                workspaceIds, sort, query, tag, range, pageRequest);

        return mapToResponse(result, userId);
    }

    /**
     * Returns trending tags (top N by frequency in the last 7 days).
     */
    public List<Map<String, Object>> getTrendingTags(int limit) {
        return discussionRepository.findTrendingTags(limit).stream()
                .map(row -> Map.<String, Object>of(
                        "tag", (String) row[0],
                        "count", ((Number) row[1]).longValue()))
                .toList();
    }

    /**
     * Returns community statistics for the sidebar.
     */
    public Map<String, Object> getStats() {
        long totalPosts = discussionRepository.count();
        return Map.of("totalPosts", totalPosts);
    }

    /* ---------- Private helpers ---------- */

    private List<UUID> resolveWorkspaceIds(UUID userId, String scope) {
        if ("ALL".equalsIgnoreCase(scope)) {
            return workspaceRepository.findAll().stream()
                    .filter(w -> w.getVisibility() == WorkspaceVisibility.PUBLIC)
                    .map(Workspace::getId)
                    .toList();
        }
        if ("SAVED".equalsIgnoreCase(scope)) {
            // Sentinel — handled after query by bookmarkRepository
            return memberRepository.findByUserIdAndStatus(userId, WorkspaceMemberStatus.ACTIVE)
                    .stream().map(WorkspaceMember::getWorkspaceId).toList();
        }
        return memberRepository.findByUserIdAndStatus(userId, WorkspaceMemberStatus.ACTIVE)
                .stream().map(WorkspaceMember::getWorkspaceId).toList();
    }

    private PageRequest buildPageRequest(String sort, int page, int size) {
        if ("HOT".equalsIgnoreCase(sort) || "TOP".equalsIgnoreCase(sort)) {
            return PageRequest.of(page, size);
        }
        return PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "createdAt"));
    }

    private Page<Discussion> executeQuery(List<UUID> wsIds, String sort,
                                           String query, String tag, String range,
                                           PageRequest pageRequest) {
        if (query != null && !query.isBlank()) {
            return discussionRepository.searchByKeyword(wsIds, query.trim(), pageRequest);
        }
        if (tag != null && !tag.isBlank()) {
            String jsonTag = "[\"" + tag.trim() + "\"]";
            return discussionRepository.findByTag(wsIds, jsonTag, pageRequest);
        }
        if ("TOP".equalsIgnoreCase(sort)) {
            Instant since = resolveSince(range);
            return discussionRepository.findTopSince(wsIds, since, pageRequest);
        }
        if ("HOT".equalsIgnoreCase(sort)) {
            return discussionRepository
                    .findByWorkspaceIdInOrderByVoteScoreDescCreatedAtDesc(wsIds, pageRequest);
        }
        return discussionRepository
                .findByWorkspaceIdInOrderByCreatedAtDesc(wsIds, pageRequest);
    }

    private Instant resolveSince(String range) {
        return switch (range != null ? range.toUpperCase() : "WEEK") {
            case "TODAY" -> Instant.now().minus(Duration.ofDays(1));
            case "MONTH" -> Instant.now().minus(Duration.ofDays(30));
            case "YEAR" -> Instant.now().minus(Duration.ofDays(365));
            case "ALL" -> Instant.EPOCH;
            default -> Instant.now().minus(Duration.ofDays(7));
        };
    }

    private Page<FeedPostResponse> mapToResponse(Page<Discussion> result, UUID userId) {
        List<UUID> discussionIds = result.getContent().stream()
                .map(Discussion::getId).toList();

        Map<UUID, String> userVotes = reactionRepository
                .findByUserIdAndTargetTypeAndTargetIdIn(userId, "DISCUSSION", discussionIds)
                .stream()
                .collect(Collectors.toMap(Reaction::getTargetId, Reaction::getReactionType));

        Set<UUID> bookmarkedIds = bookmarkRepository
                .findByUserIdAndDiscussionIdIn(userId, discussionIds)
                .stream()
                .map(Bookmark::getDiscussionId)
                .collect(Collectors.toSet());

        return result.map(d -> {
            String wsName = workspaceRepository.findById(d.getWorkspaceId())
                    .map(Workspace::getName).orElse("Unknown");
            String authorName = userRepository.findById(d.getAuthorId())
                    .map(u -> u.getEmail().split("@")[0]).orElse("Unknown");

            return new FeedPostResponse(
                    d.getId(), d.getWorkspaceId(), wsName,
                    d.getAuthorId(), authorName, null,
                    d.getTitle(), d.getBody(), d.getLabel(),
                    d.getVoteScore(), d.getReplyCount(),
                    userVotes.get(d.getId()),
                    d.getTags(),
                    d.getAcceptedReplyId() != null,
                    bookmarkedIds.contains(d.getId()),
                    d.getCreatedAt()
            );
        });
    }
}
