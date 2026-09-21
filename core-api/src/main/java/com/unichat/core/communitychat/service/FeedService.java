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

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;

import com.unichat.core.communitychat.api.FeedPostResponse;
import com.unichat.core.communitychat.api.PostAttachmentResponse;
import com.unichat.core.communitychat.api.ReactionSummary;
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

    /** Sort modes whose queries already contain an ORDER BY clause. */
    private static final Set<String> SELF_ORDERED_SORTS =
            Set.of("HOT", "TOP", "UNANSWERED", "MINE");

    private static final ObjectMapper TAG_MAPPER = new ObjectMapper();

    private final DiscussionRepository discussionRepository;
    private final WorkspaceMemberRepository memberRepository;
    private final WorkspaceRepository workspaceRepository;
    private final UserRepository userRepository;
    private final ReactionRepository reactionRepository;
    private final BookmarkRepository bookmarkRepository;
    private final PostAttachmentService attachmentService;
    private final ReactionService reactionService;

    public FeedService(DiscussionRepository discussionRepository,
                       WorkspaceMemberRepository memberRepository,
                       WorkspaceRepository workspaceRepository,
                       UserRepository userRepository,
                       ReactionRepository reactionRepository,
                       BookmarkRepository bookmarkRepository,
                       PostAttachmentService attachmentService,
                       ReactionService reactionService) {
        this.reactionService = reactionService;
        this.attachmentService = attachmentService;
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
                userId, workspaceIds, sort, scope, query, tag, range, pageRequest);

        return mapToResponse(result, userId);
    }

    /**
     * Returns trending tags (top N by frequency in the last 7 days), restricted
     * to workspaces the user belongs to so private tags are not exposed.
     */
    public List<Map<String, Object>> getTrendingTags(UUID userId, int limit) {
        List<UUID> workspaceIds = resolveWorkspaceIds(userId, "JOINED");
        if (workspaceIds.isEmpty()) {
            return List.of();
        }
        return discussionRepository.findTrendingTags(workspaceIds, limit).stream()
                .map(row -> Map.<String, Object>of(
                        "tag", (String) row[0],
                        "count", ((Number) row[1]).longValue()))
                .toList();
    }

    /**
     * Returns counts for the feed sidebar, scoped to the user's workspaces.
     */
    public Map<String, Object> getStats(UUID userId) {
        List<UUID> workspaceIds = resolveWorkspaceIds(userId, "JOINED");
        if (workspaceIds.isEmpty()) {
            return Map.of("totalPosts", 0L, "unansweredCount", 0L);
        }
        long totalPosts = discussionRepository
                .findByWorkspaceIdInOrderByCreatedAtDesc(workspaceIds, PageRequest.of(0, 1))
                .getTotalElements();
        long unanswered = discussionRepository.countUnanswered(workspaceIds);
        return Map.of("totalPosts", totalPosts, "unansweredCount", unanswered);
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
        // Native queries carry their own ORDER BY; adding a Sort would append a
        // second, conflicting clause.
        if (SELF_ORDERED_SORTS.contains(sort == null ? "" : sort.toUpperCase())) {
            return PageRequest.of(page, size);
        }
        return PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "createdAt"));
    }

    private Page<Discussion> executeQuery(UUID userId, List<UUID> wsIds, String sort, String scope,
                                           String query, String tag, String range,
                                           PageRequest pageRequest) {
        if (query != null && !query.isBlank()) {
            return discussionRepository.searchByKeyword(wsIds, query.trim(), pageRequest);
        }
        if (tag != null && !tag.isBlank()) {
            return discussionRepository.findByTag(wsIds, toJsonTagArray(tag), pageRequest);
        }
        if ("SAVED".equalsIgnoreCase(scope)) {
            return discussionRepository.findBookmarked(userId, wsIds, pageRequest);
        }
        if ("UNANSWERED".equalsIgnoreCase(sort)) {
            return discussionRepository.findUnanswered(wsIds, pageRequest);
        }
        if ("MINE".equalsIgnoreCase(sort)) {
            return discussionRepository
                    .findByWorkspaceIdInAndAuthorIdOrderByCreatedAtDesc(wsIds, userId, pageRequest);
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

    /**
     * Serialises a tag into a one-element JSON array for the {@code @>} operator.
     * Built with Jackson rather than string concatenation: a tag containing a
     * quote would otherwise produce invalid JSON and fail the cast.
     */
    private String toJsonTagArray(String tag) {
        try {
            return TAG_MAPPER.writeValueAsString(List.of(tag.trim()));
        } catch (JsonProcessingException e) {
            throw new IllegalArgumentException("Thẻ không hợp lệ", e);
        }
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

        Map<UUID, ReactionSummary> reactions =
                reactionService.summariseAll("DISCUSSION", discussionIds, userId);

        Set<UUID> bookmarkedIds = bookmarkRepository
                .findByUserIdAndDiscussionIdIn(userId, discussionIds)
                .stream()
                .map(Bookmark::getDiscussionId)
                .collect(Collectors.toSet());

        // Batch the workspace and author lookups: doing them inside the map
        // meant two extra queries per post.
        Map<UUID, String> workspaceNames = workspaceRepository
                .findAllById(result.getContent().stream()
                        .map(Discussion::getWorkspaceId).distinct().toList())
                .stream()
                .collect(Collectors.toMap(Workspace::getId, Workspace::getName));

        Map<UUID, String> authorNames = userRepository
                .findAllById(result.getContent().stream()
                        .map(Discussion::getAuthorId).distinct().toList())
                .stream()
                .collect(Collectors.toMap(u -> u.getId(), u -> u.getEmail().split("@")[0]));

        Map<UUID, List<PostAttachmentResponse>> attachments =
                attachmentService.listForAll(discussionIds);

        return result.map(d -> {
            String wsName = workspaceNames.getOrDefault(d.getWorkspaceId(), "Unknown");
            String authorName = authorNames.getOrDefault(d.getAuthorId(), "Unknown");

            return new FeedPostResponse(
                    d.getId(), d.getWorkspaceId(), wsName,
                    d.getAuthorId(), authorName, null,
                    d.getTitle(), d.getBody(), d.getLabel(),
                    d.getVoteScore(), d.getReplyCount(),
                    reactions.getOrDefault(d.getId(), ReactionSummary.empty()),
                    d.getTags(),
                    d.getAcceptedReplyId() != null,
                    bookmarkedIds.contains(d.getId()),
                    d.getCreatedAt(),
                    attachments.getOrDefault(d.getId(), List.of())
            );
        });
    }
}
