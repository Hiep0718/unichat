package com.unichat.core.auth.service;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;
import java.time.Clock;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.List;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.jwt.JwtEncoder;
import org.springframework.security.oauth2.jwt.JwtEncoderParameters;
import com.unichat.core.auth.config.JwtProperties;
import com.unichat.core.auth.domain.RefreshFamily;
import com.unichat.core.auth.domain.RefreshFamilyRepository;
import com.unichat.core.auth.domain.RefreshToken;
import com.unichat.core.auth.domain.RefreshTokenRepository;
import com.unichat.core.common.error.UnauthenticatedError;
import com.unichat.core.user.domain.SystemRole;
import com.unichat.core.user.domain.User;
import com.unichat.core.user.domain.UserStatus;

class TokenServiceTest {
    private final Instant now = Instant.parse("2026-10-11T00:00:00Z");
    private final Clock clock = Clock.fixed(now, ZoneOffset.UTC);
    private final JwtEncoder encoder = mock(JwtEncoder.class);
    private final RefreshTokenRepository tokens = mock(RefreshTokenRepository.class);
    private final RefreshFamilyRepository families = mock(RefreshFamilyRepository.class);
    private final RefreshTransactions transactions = mock(RefreshTransactions.class);
    private final TokenService service = new TokenService(encoder, tokens, families, transactions, clock, new JwtProperties(1800));

    @Test
    void shouldBindAccessToFamilyRevisionIssuerAudienceAndFifteenMinutes() {
        User user = user(); UUID familyId = UUID.randomUUID(); user.invalidateCredentials();
        when(encoder.encode(any())).thenReturn(jwt());
        assertEquals("access", service.generateAccessToken(user, familyId));
        var captured = ArgumentCaptor.forClass(JwtEncoderParameters.class); verify(encoder).encode(captured.capture());
        var claims = captured.getValue().getClaims();
        assertEquals("unichat-core-api", claims.getClaimAsString("iss"));
        assertEquals(List.of("unichat-client"), claims.getAudience());
        assertEquals(familyId.toString(), claims.getClaim("sid"));
        assertEquals(1L, claims.<Long>getClaim("securityVersion").longValue());
        assertEquals(now.plusSeconds(900), claims.getExpiresAt());
    }
    @Test
    void shouldPersistHashOnlyWithAbsoluteSevenDayExpiry() {
        UUID userId = UUID.randomUUID(), familyId = UUID.randomUUID();
        String raw = service.createRefreshToken(userId, familyId);
        var family = ArgumentCaptor.forClass(RefreshFamily.class); var token = ArgumentCaptor.forClass(RefreshToken.class);
        verify(families).saveAndFlush(family.capture()); verify(tokens).save(token.capture());
        assertEquals(43, raw.length()); assertEquals(now.plusSeconds(604800), family.getValue().getExpiresAt());
        assertEquals(TokenHash.digest(raw), token.getValue().getTokenHash());
        assertNotEquals(raw, token.getValue().getTokenHash());
    }
    @Test
    void shouldExposeDenialAfterRotationReturns() {
        when(transactions.rotate("old")).thenReturn(RefreshTransactions.Rotation.denied());
        assertThrows(UnauthenticatedError.class, () -> service.refresh("old"));
        verifyNoInteractions(encoder);
    }
    @Test
    void shouldSignOnlySuccessfulRotation() {
        when(transactions.rotate("old")).thenReturn(new RefreshTransactions.Rotation(user(), UUID.randomUUID(), "next"));
        when(encoder.encode(any())).thenReturn(jwt());
        assertEquals("next", service.refresh("old").refreshToken());
    }
    @Test
    void shouldRevokeAllFamiliesAndActiveRefreshTokens() {
        User user = user(); var token = new RefreshToken(UUID.randomUUID(), user.getId(), UUID.randomUUID(), "hash", now.plusSeconds(60));
        when(tokens.findByUserIdAndRevokedAtIsNull(user.getId())).thenReturn(List.of(token));
        service.revokeAllTokensByUser(user.getId());
        assertEquals(now, token.getRevokedAt()); verify(families).revokeByUser(user.getId(), now);
    }
    private User user() { return new User(UUID.randomUUID(), "student@unichat.vn", "hash", SystemRole.USER, UserStatus.ACTIVE, now); }
    private Jwt jwt() { return Jwt.withTokenValue("access").header("alg", "RS256").subject("subject").build(); }
}
