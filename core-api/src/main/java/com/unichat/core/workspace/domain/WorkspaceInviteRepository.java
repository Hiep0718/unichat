package com.unichat.core.workspace.domain;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

/**
 * Gateway to invite-link storage.
 */
@Repository
public interface WorkspaceInviteRepository extends JpaRepository<WorkspaceInvite, UUID> {

    /**
     * Finds an invitation by the hash of the token presented.
     *
     * <p>Looked up by hash rather than by id because the hash is all that is
     * stored; the caller hashes what arrived and asks for the match.
     */
    Optional<WorkspaceInvite> findByTokenHash(String tokenHash);

    /** A workspace's invitations, newest first, for the owner's list. */
    List<WorkspaceInvite> findByWorkspaceIdOrderByCreatedAtDesc(UUID workspaceId);
}
