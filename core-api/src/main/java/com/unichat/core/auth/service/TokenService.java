package com.unichat.core.auth.service;

import java.time.Clock;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.UUID;
import org.springframework.security.oauth2.jwt.JwtClaimsSet;
import org.springframework.security.oauth2.jwt.JwtEncoder;
import org.springframework.security.oauth2.jwt.JwtEncoderParameters;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import com.unichat.core.auth.config.JwtProperties;
import com.unichat.core.auth.domain.RefreshFamily;
import com.unichat.core.auth.domain.RefreshFamilyRepository;
import com.unichat.core.auth.domain.RefreshToken;
import com.unichat.core.auth.domain.RefreshTokenRepository;
import com.unichat.core.common.error.UnauthenticatedError;
import com.unichat.core.user.domain.User;

/** Issues short-lived credentials bound to a durable, revocable session. */
@Service
public class TokenService {
    private final JwtEncoder encoder;
    private final RefreshTokenRepository tokens;
    private final RefreshFamilyRepository families;
    private final RefreshTransactions transactions;
    private final Clock clock;
    private final JwtProperties properties;
    /** Uses existing signing material and explicit session persistence. */
    public TokenService(JwtEncoder encoder, RefreshTokenRepository tokens,
            RefreshFamilyRepository families, RefreshTransactions transactions, Clock clock, JwtProperties properties) {
        this.encoder = encoder; this.tokens = tokens; this.families = families;
        this.transactions = transactions; this.clock = clock; this.properties = properties;
    }
    /** Signs an RS256 access token with issuer, audience, sid and security revision. */
    public String generateAccessToken(User user, UUID familyId) {
        Instant now = Instant.now(clock);
        JwtClaimsSet claims = JwtClaimsSet.builder().issuer("unichat-core-api")
                .audience(List.of("unichat-client")).issuedAt(now)
                .expiresAt(now.plusSeconds(Math.min(900, properties.accessTokenTtlSeconds())))
                .subject(user.getId().toString()).claim("email", user.getEmail())
                .claim("scope", user.getSystemRole().name()).claim("sid", familyId.toString())
                .claim("securityVersion", user.getSecurityVersion()).build();
        return encoder.encode(JwtEncoderParameters.from(claims)).getTokenValue();
    }
    /** Creates a new family and its first 256-bit opaque credential. */
    @Transactional
    public String createRefreshToken(UUID userId, UUID familyId) {
        Instant expiry = Instant.now(clock).plus(7, ChronoUnit.DAYS);
        String rawToken = TokenHash.generate();
        families.saveAndFlush(new RefreshFamily(familyId, userId, expiry));
        tokens.save(new RefreshToken(UUID.randomUUID(), userId, familyId, TokenHash.digest(rawToken), expiry));
        return rawToken;
    }
    /** Returns rotated credentials after the mutation transaction has committed. */
    public AuthService.TokenPair refresh(String rawToken) {
        var result = transactions.rotate(rawToken);
        if (!result.accepted()) throw new UnauthenticatedError("Phiên đăng nhập không còn hợp lệ.");
        return new AuthService.TokenPair(generateAccessToken(result.user(), result.familyId()), result.rawToken());
    }
    /** Idempotently revokes the token family, including a concurrent successor. */
    public void revokeFamily(String rawToken) { transactions.revoke(rawToken); }
    /** Revokes every session; account mutation callers already hold the user row lock. */
    @Transactional
    public void revokeAllTokensByUser(UUID userId) {
        Instant now = Instant.now(clock);
        families.revokeByUser(userId, now);
        tokens.findByUserIdAndRevokedAtIsNull(userId).forEach(token -> token.setRevokedAt(now));
    }
}