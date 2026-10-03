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
}
