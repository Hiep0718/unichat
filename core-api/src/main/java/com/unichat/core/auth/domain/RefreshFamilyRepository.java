package com.unichat.core.auth.domain;

import java.time.Instant;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import jakarta.persistence.LockModeType;

/** Session persistence; callers acquire the account lock before family locks. */
public interface RefreshFamilyRepository extends JpaRepository<RefreshFamily, UUID> {
    /** Locks one session for rotation/revocation. */
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT f FROM RefreshFamily f WHERE f.id = :id")
    Optional<RefreshFamily> lockById(@Param("id") UUID id);
    /** Revokes all sessions within an account mutation transaction. */
    @Modifying
    @Query("UPDATE RefreshFamily f SET f.revokedAt = :now WHERE f.userId = :userId AND f.revokedAt IS NULL")
    int revokeByUser(@Param("userId") UUID userId, @Param("now") Instant now);
}
