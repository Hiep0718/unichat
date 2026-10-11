package com.unichat.core.shared.config;

import java.time.Clock;
import java.time.Instant;
import java.util.UUID;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import com.nimbusds.jose.JOSEException;
import com.nimbusds.jose.JWSAlgorithm;
import com.nimbusds.jose.JWSHeader;
import com.nimbusds.jose.crypto.RSASSASigner;
import com.nimbusds.jwt.JWTClaimsSet;
import com.nimbusds.jwt.SignedJWT;
import com.unichat.core.shared.servicesecurity.RequestBinding;
import com.unichat.core.shared.servicesecurity.ServiceKeys;

/** Signs short-lived, request-bound Core service JWTs with a separate identity. */
@Component
public class ServiceTokenIssuer {
    private final ServiceKeys keys;
    private final Clock clock;
    private final String keyId;
    /** Uses configured service keys only, never access-token keys or static secrets. */
    public ServiceTokenIssuer(ServiceKeys keys, Clock clock,
            @Value("${CORE_SERVICE_KEY_ID:core-service-v1}") String keyId) {
        this.keys = keys; this.clock = clock; this.keyId = keyId;
    }
    /** Signs the precise method, target and body used for one outbound request. */
    public String issueToken(String method, String path, String query, byte[] rawBody,
            String requestId, String idempotencyKey) {
        Instant now = Instant.now(clock);
        var claims = new JWTClaimsSet.Builder().issuer("unichat-core").audience("unichat-ai")
                .subject("core-api").jwtID(UUID.randomUUID().toString())
                .issueTime(java.util.Date.from(now)).expirationTime(java.util.Date.from(now.plusSeconds(60)))
                .claim("purpose", "ai-request").claim("method", method).claim("path", path)
                .claim("query", query == null ? "" : query).claim("bodyHash", RequestBinding.hash(rawBody))
                .claim("requestId", requestId).claim("idempotencyKey", idempotencyKey == null ? "" : idempotencyKey)
                .build();
        var token = new SignedJWT(new JWSHeader.Builder(JWSAlgorithm.RS256).keyID(keyId).build(), claims);
        try { token.sign(new RSASSASigner(keys.privateKey())); return "Bearer " + token.serialize(); }
        catch (JOSEException error) { throw new IllegalStateException("Service signing failed", error); }
    }
    /** Legacy consumers must migrate to request binding; the AI verifier rejects this token. */
    @Deprecated
    public String issueToken() {
        return issueToken("POST", "/unsupported-legacy-binding", "", new byte[0], UUID.randomUUID().toString(), "");
    }
}
