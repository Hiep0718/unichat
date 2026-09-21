package com.unichat.core.communitychat.domain;

import java.util.List;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

@Repository
public interface PostReadRepository extends JpaRepository<PostRead, PostReadId> {

    List<PostRead> findByIdDiscussionIdOrderByReadAtDesc(UUID discussionId);

    long countByIdDiscussionId(UUID discussionId);

    boolean existsByIdDiscussionIdAndIdUserId(UUID discussionId, UUID userId);

    /** Read counts for a page of posts, so listings avoid a query per post. */
    @Query("SELECT r.id.discussionId, count(r) FROM PostRead r "
            + "WHERE r.id.discussionId IN :discussionIds GROUP BY r.id.discussionId")
    List<Object[]> countByDiscussionIds(@Param("discussionIds") List<UUID> discussionIds);
}
