package com.unichat.core.auth.domain;

import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;

/**
 * Persistence operations for RefreshToken lifecycle.
 */
public interface RefreshTokenRepository extends JpaRepository<RefreshToken, UUID> {

    /**
     * Finds a refresh token by its unique hash.
     *
     * @param tokenHash cryptographic token hash
     * @return matching RefreshToken if present
     */
    Optional<RefreshToken> findByTokenHash(String tokenHash);

    /**
     * Finds all unrevoked refresh tokens belonging to a user.
     *
     * @param userId the user ID
     * @return list of active tokens
     */
    List<RefreshToken> findByUserIdAndRevokedAtIsNull(UUID userId);

    /**
     * Finds all refresh tokens belonging to a rotation family.
     *
     * @param familyId token family ID
     * @return list of tokens in the family
     */
    List<RefreshToken> findByFamilyId(UUID familyId);

    /**
     * Deletes expired refresh tokens.
     *
     * @param now current time reference
     */
    void deleteByExpiresAtBefore(Instant now);
}
