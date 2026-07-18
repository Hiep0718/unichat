package com.unichat.core.auth.service;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.time.Clock;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.Base64;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.jwt.JwtEncoder;
import org.springframework.security.oauth2.jwt.JwtEncoderParameters;

import com.unichat.core.auth.domain.RefreshToken;
import com.unichat.core.auth.domain.RefreshTokenRepository;
import com.unichat.core.common.error.UnauthenticatedError;
import com.unichat.core.user.domain.SystemRole;
import com.unichat.core.user.domain.User;
import com.unichat.core.user.domain.UserStatus;
import com.unichat.core.auth.config.JwtProperties;

class TokenServiceTest {

    private JwtEncoder jwtEncoder;
    private RefreshTokenRepository refreshTokenRepository;
    private Clock clock;
    private JwtProperties jwtProperties;
    private TokenService tokenService;

    @BeforeEach
    void setUp() {
        jwtEncoder = mock(JwtEncoder.class);
        refreshTokenRepository = mock(RefreshTokenRepository.class);
        jwtProperties = mock(JwtProperties.class);
        when(jwtProperties.accessTokenTtlSeconds()).thenReturn(900);
        clock = Clock.fixed(Instant.parse("2026-07-16T00:00:00Z"), ZoneOffset.UTC);
        tokenService = new TokenService(jwtEncoder, refreshTokenRepository, clock, jwtProperties);
    }

    @Test
    void shouldGenerateAccessToken() {
        // Arrange
        var user = new User(UUID.randomUUID(), "test@unichat.com", "hash", SystemRole.USER, UserStatus.ACTIVE, Instant.now(clock));
        var mockJwt = mock(Jwt.class);
        when(mockJwt.getTokenValue()).thenReturn("mocked_jwt_value");
        when(jwtEncoder.encode(any(JwtEncoderParameters.class))).thenReturn(mockJwt);

        // Act
        var token = tokenService.generateAccessToken(user);

        // Assert
        assertEquals("mocked_jwt_value", token);
    }

    @Test
    void shouldRotateRefreshTokenSuccessfully() {
        // Arrange
        var rawToken = "raw_refresh_token_123";
        var familyId = UUID.randomUUID();
        var userId = UUID.randomUUID();
        var tokenHash = hashToken(rawToken);

        var existingToken = new RefreshToken(
                UUID.randomUUID(), userId, familyId, tokenHash, Instant.now(clock).plusSeconds(3600)
        );

        when(refreshTokenRepository.findByTokenHash(tokenHash)).thenReturn(Optional.of(existingToken));
        when(refreshTokenRepository.findByTokenHash(anyString())).thenAnswer(invocation -> {
            String h = invocation.getArgument(0);
            if (h.equals(tokenHash)) {
                return Optional.of(existingToken);
            }
            var nextToken = new RefreshToken(UUID.randomUUID(), userId, familyId, h, Instant.now(clock).plusSeconds(3600));
            return Optional.of(nextToken);
        });

        // Act
        var nextRaw = tokenService.rotateRefreshToken(rawToken);

        // Assert
        assertNotNull(nextRaw);
        assertNotEquals(rawToken, nextRaw);
        assertNotNull(existingToken.getUsedAt());
        assertNotNull(existingToken.getReplacedById());
        verify(refreshTokenRepository, times(2)).save(any(RefreshToken.class));
    }

    @Test
    void shouldRevokeAllTokensOnReuseDetection() {
        // Arrange
        var rawToken = "used_token";
        var familyId = UUID.randomUUID();
        var userId = UUID.randomUUID();
        var tokenHash = hashToken(rawToken);

        var usedToken = new RefreshToken(
                UUID.randomUUID(), userId, familyId, tokenHash, Instant.now(clock).plusSeconds(3600)
        );
        usedToken.setUsedAt(Instant.now(clock).minusSeconds(60));

        var activeToken = new RefreshToken(
                UUID.randomUUID(), userId, familyId, "active_hash", Instant.now(clock).plusSeconds(3600)
        );

        when(refreshTokenRepository.findByTokenHash(tokenHash)).thenReturn(Optional.of(usedToken));
        when(refreshTokenRepository.findByFamilyId(familyId)).thenReturn(List.of(usedToken, activeToken));

        // Act & Assert
        assertThrows(UnauthenticatedError.class, () -> tokenService.rotateRefreshToken(rawToken));
        assertNotNull(usedToken.getRevokedAt());
        assertNotNull(activeToken.getRevokedAt());
    }

    private String hashToken(String token) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            byte[] hash = digest.digest(token.getBytes(StandardCharsets.UTF_8));
            return Base64.getEncoder().encodeToString(hash);
        } catch (Exception e) {
            throw new IllegalStateException(e);
        }
    }
}
