package com.unichat.core.workspace.domain;

import java.util.List;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

/**
 * Gateway to the topics attached to workspaces.
 */
@Repository
public interface WorkspaceTopicRepository
        extends JpaRepository<WorkspaceTopicAssignment, WorkspaceTopicId> {

    /** One workspace's topics. */
    List<WorkspaceTopicAssignment> findByWorkspaceId(UUID workspaceId);

    /**
     * Topics for a whole page of workspaces in one query.
     *
     * <p>A listing shows twenty cards; asking per card would be twenty round
     * trips for one screen, which is the problem
     * {@link com.unichat.core.workspace.service.WorkspaceStatsLoader} exists
     * to avoid for every other figure on the same card.
     */
    List<WorkspaceTopicAssignment> findByWorkspaceIdIn(List<UUID> workspaceIds);

    /**
     * Clears a workspace's topics, so a new set can replace them.
     *
     * <p>Replace rather than diff: the set is at most three rows, and working
     * out which to add and which to remove is more code than rewriting them.
     */
    @Modifying
    @Query("DELETE FROM WorkspaceTopicAssignment t WHERE t.workspaceId = :workspaceId")
    void deleteByWorkspaceId(@Param("workspaceId") UUID workspaceId);

    /**
     * How many discoverable workspaces sit under each topic.
     *
     * <p>Drives the filter rail on Khám phá. With twenty topics in the
     * vocabulary and a handful of public groups, showing every chip means
     * most of them lead to an empty page — a filter that mostly produces
     * "không có kết quả" teaches people not to use it. Only topics that
     * actually have something behind them are offered.
     *
     * <p>Scoped exactly like the discovery queries themselves: active, public,
     * and not already joined by this caller, so a chip's count matches the
     * number of cards pressing it produces.
     *
     * @return rows of {topic, count}; a topic with nothing is simply absent
     */
    @Query(value = "SELECT t.topic, COUNT(*) FROM workspace_topics t "
            + "JOIN workspaces w ON w.id = t.workspace_id "
            + "WHERE w.status = 'ACTIVE' AND w.visibility = 'PUBLIC' "
            + "  AND NOT EXISTS (SELECT 1 FROM workspace_members m "
            + "                  WHERE m.workspace_id = w.id AND m.user_id = :userId "
            + "                    AND m.status = 'ACTIVE') "
            + "GROUP BY t.topic", nativeQuery = true)
    List<Object[]> countDiscoverableByTopic(@Param("userId") UUID userId);
}
