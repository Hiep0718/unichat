package com.unichat.core.auth.service;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.SecureRandom;
import java.time.Clock;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.Base64;
import java.util.UUID;

import org.springframework.security.oauth2.jwt.JwtClaimsSet;
import org.springframework.security.oauth2.jwt.JwtEncoder;
import org.springframework.security.oauth2.jwt.JwtEncoderParameters;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.unichat.core.auth.domain.RefreshToken;
import com.unichat.core.auth.domain.RefreshTokenRepository;
import com.unichat.core.common.error.ConflictError;
import com.unichat.core.common.error.UnauthenticatedError;
import com.unichat.core.user.domain.User;
import com.unichat.core.shared.util.UuidGenerator;
import com.unichat.core.auth.config.JwtProperties;

/**
 * Manages JWT generation and opaque refresh token lifecycle.
 */
@Service
public class TokenService {

    private final JwtEncoder jwtEncoder;
    private final RefreshTokenRepository refreshTokenRepository;
    private final Clock clock;
    private final JwtProperties jwtProperties;
    private final SecureRandom secureRandom = new SecureRandom();

    public TokenService(
            JwtEncoder jwtEncoder,
            RefreshTokenRepository refreshTokenRepository,
            Clock clock,
            JwtProperties jwtProperties) {
        this.jwtEncoder = jwtEncoder;
        this.refreshTokenRepository = refreshTokenRepository;
        this.clock = clock;
        this.jwtProperties = jwtProperties;
    }

    /**
     * Generates a signed RS256 JWT access token.
     */
    public String generateAccessToken(User user) {
        Instant now = Instant.now(clock);
        JwtClaimsSet claims = JwtClaimsSet.builder()
                .issuer("unichat-core-api")
                .issuedAt(now)
                .expiresAt(now.plus(jwtProperties.accessTokenTtlSeconds(), ChronoUnit.SECONDS))
                .subject(user.getId().toString())
                .claim("email", user.getEmail())
                .claim("scope", user.getSystemRole().name())
                .build();
        return jwtEncoder.encode(JwtEncoderParameters.from(claims)).getTokenValue();
    }

    /**
     * Creates and persists a new RefreshToken in a family.
     */
    @Transactional
    public String createRefreshToken(UUID userId, UUID familyId) {
        String rawToken = generateOpaqueToken();
        String hash = hashToken(rawToken);
        Instant now = Instant.now(clock);
        Instant expiresAt = now.plus(7, ChronoUnit.DAYS);

        RefreshToken token = new RefreshToken(
                UuidGenerator.generateV7(),
                userId,
                familyId,
                hash,
                expiresAt
        );
        refreshTokenRepository.save(token);
        return rawToken;
    }

    /**
     * Rotates a refresh token (reuse detection and family revocation).
     */
    @Transactional
    public String rotateRefreshToken(String rawToken) {
        String hash = hashToken(rawToken);
        RefreshToken token = refreshTokenRepository.findByTokenHash(hash)
                .orElseThrow(() -> new UnauthenticatedError("Token không hợp lệ"));

        Instant now = Instant.now(clock);
        if (token.getExpiresAt().isBefore(now) || token.getRevokedAt() != null) {
            throw new UnauthenticatedError("Token đã hết hạn hoặc bị thu hồi");
        }

        // Reuse detection
        if (token.getUsedAt() != null) {
            // Revoke entire family
            refreshTokenRepository.findByFamilyId(token.getFamilyId()).forEach(t -> {
                if (t.getRevokedAt() == null) {
                    t.setRevokedAt(now);
                }
            });
            throw new UnauthenticatedError("Phát hiện Token đã được sử dụng trước đó. Tất cả token trong phiên đã bị thu hồi.");
        }

        token.setUsedAt(now);
        String nextRaw = generateOpaqueToken();
        String nextHash = hashToken(nextRaw);
        RefreshToken nextToken = new RefreshToken(
                UuidGenerator.generateV7(),
                token.getUserId(),
                token.getFamilyId(),
                nextHash,
                token.getExpiresAt()
        );
        token.setReplacedById(nextToken.getId());
        refreshTokenRepository.save(token);
        refreshTokenRepository.save(nextToken);

        return nextRaw;
    }

    /**
     * Revokes all tokens in the family of the given token.
     */
    @Transactional
    public void revokeFamily(String rawToken) {
        String hash = hashToken(rawToken);
        refreshTokenRepository.findByTokenHash(hash).ifPresent(token -> {
            Instant now = Instant.now(clock);
            refreshTokenRepository.findByFamilyId(token.getFamilyId()).forEach(t -> {
                if (t.getRevokedAt() == null) {
                    t.setRevokedAt(now);
                }
            });
        });
    }

    /**
     * Revokes all active tokens for a specific user.
     */
    @Transactional
    public void revokeAllTokensByUser(UUID userId) {
        Instant now = Instant.now(clock);
        refreshTokenRepository.findByUserIdAndRevokedAtIsNull(userId).forEach(t -> {
            t.setRevokedAt(now);
        });
    }

    public UUID getUserIdFromRefreshToken(String rawToken) {
        String hash = hashToken(rawToken);
        return refreshTokenRepository.findByTokenHash(hash)
                .map(RefreshToken::getUserId)
                .orElseThrow(() -> new UnauthenticatedError("Token không hợp lệ"));
    }

    private String generateOpaqueToken() {
        byte[] bytes = new byte[32];
        secureRandom.nextBytes(bytes);
        return Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
    }

    private String hashToken(String token) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            byte[] hash = digest.digest(token.getBytes(StandardCharsets.UTF_8));
            return Base64.getEncoder().encodeToString(hash);
        } catch (Exception e) {
            throw new IllegalStateException("Hashing failed", e);
        }
    }
}
