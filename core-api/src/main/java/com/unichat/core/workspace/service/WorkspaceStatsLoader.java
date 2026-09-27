package com.unichat.core.workspace.service;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.unichat.core.communitychat.domain.DiscussionRepository;
import com.unichat.core.document.domain.DocumentRepository;
import com.unichat.core.workspace.api.WorkspaceCardStats;
import com.unichat.core.workspace.domain.WorkspaceMemberRepository;
import com.unichat.core.workspace.domain.WorkspaceMemberStatus;

/**
 * Gathers what a page of workspace cards needs, in four queries for the page.
 *
 * <p>The previous mapping ran one member count per workspace, so listing twenty
 * groups meant twenty round trips; adding documents, activity and faces the
 * same way would have made it eighty. Each figure here is one grouped query
 * over the whole page instead, which keeps the cost flat as the page grows.
 */
@Service
public class WorkspaceStatsLoader {

    /** Faces beyond this are summarised as "+N" rather than drawn. */
    private static final int FACES_PER_CARD = 4;

    /** "Recent" for the activity line; a week matches the feed's own window. */
    private static final Duration RECENT_WINDOW = Duration.ofDays(7);

    private final DocumentRepository documentRepository;
    private final WorkspaceMemberRepository memberRepository;
    private final DiscussionRepository discussionRepository;
    private final Clock clock;

    public WorkspaceStatsLoader(DocumentRepository documentRepository,
                                WorkspaceMemberRepository memberRepository,
                                DiscussionRepository discussionRepository,
                                Clock clock) {
        this.documentRepository = documentRepository;
        this.memberRepository = memberRepository;
        this.discussionRepository = discussionRepository;
        this.clock = clock;
    }

    /**
     * Loads card statistics for every workspace in one page.
     *
     * @param workspaceIds the page's workspaces; an empty list issues no query
     * @return stats per workspace id, with {@link WorkspaceCardStats#empty()}
     *         for any that has nothing counted
     */
    @Transactional(readOnly = true)
    public Map<UUID, WorkspaceCardStats> loadFor(List<UUID> workspaceIds) {
        if (workspaceIds.isEmpty()) {
            return Map.of();
        }

        Map<UUID, Long> documents = countsFrom(
                documentRepository.countGroupedByWorkspaceIds(workspaceIds));
        Map<UUID, Long> members = countsFrom(
                memberRepository.countGroupedByWorkspaceIds(workspaceIds, WorkspaceMemberStatus.ACTIVE));
        Map<UUID, Long> recentPosts = countsFrom(
                discussionRepository.countRecentGroupedByWorkspaceIds(workspaceIds, recentSince()));
        Map<UUID, List<WorkspaceCardStats.MemberFace>> faces = facesFrom(
                memberRepository.findFacesForWorkspaces(workspaceIds, FACES_PER_CARD));

        Map<UUID, WorkspaceCardStats> stats = new HashMap<>();
        for (UUID id : workspaceIds) {
            stats.put(id, new WorkspaceCardStats(
                    documents.getOrDefault(id, 0L),
                    members.getOrDefault(id, 0L),
                    recentPosts.getOrDefault(id, 0L),
                    faces.getOrDefault(id, List.of())));
        }
        return stats;
    }

    /** Convenience for the single-workspace paths, which map one card. */
    @Transactional(readOnly = true)
    public WorkspaceCardStats loadOne(UUID workspaceId) {
        return loadFor(List.of(workspaceId))
                .getOrDefault(workspaceId, WorkspaceCardStats.empty());
    }

    private Instant recentSince() {
        return Instant.now(clock).minus(RECENT_WINDOW);
    }

    /** Folds {id, count} rows into a map, tolerating any numeric count type. */
    private static Map<UUID, Long> countsFrom(List<Object[]> rows) {
        Map<UUID, Long> counts = new HashMap<>();
        for (Object[] row : rows) {
            counts.put((UUID) row[0], ((Number) row[1]).longValue());
        }
        return counts;
    }

    private static Map<UUID, List<WorkspaceCardStats.MemberFace>> facesFrom(List<Object[]> rows) {
        Map<UUID, List<WorkspaceCardStats.MemberFace>> faces = new HashMap<>();
        for (Object[] row : rows) {
            UUID workspaceId = (UUID) row[0];
            faces.computeIfAbsent(workspaceId, key -> new ArrayList<>())
                    .add(new WorkspaceCardStats.MemberFace(
                            (UUID) row[1],
                            (String) row[2],
                            Boolean.TRUE.equals(row[3]),
                            (String) row[4]));
        }
        return faces;
    }
}
