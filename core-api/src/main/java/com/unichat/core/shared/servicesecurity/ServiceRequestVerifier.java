package com.unichat.core.shared.servicesecurity;

import java.time.Clock;
import java.time.Instant;
import java.util.Objects;
import java.util.UUID;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import com.nimbusds.jose.JWSAlgorithm;
import com.nimbusds.jose.crypto.RSASSAVerifier;
import com.nimbusds.jwt.JWTClaimsSet;
import com.nimbusds.jwt.SignedJWT;
import com.unichat.core.common.error.UnauthenticatedError;

/** Verifies the reverse AI identity and exact HTTP binding before any private action. */
@Component
public class ServiceRequestVerifier {
    private final ServiceKeys keys;
    private final ServiceNonceService nonces;
    private final Clock clock;
    private final String keyId;
    /** Uses an independent AI public key and durable replay store. */
    public ServiceRequestVerifier(ServiceKeys keys, ServiceNonceService nonces, Clock clock,
            @Value("${AI_SERVICE_KEY_ID:ai-service-v1}") String keyId) {
        this.keys = keys; this.nonces = nonces; this.clock = clock; this.keyId = keyId;
    }
    /** Verifies signature, time, identity, request bytes and one-use nonce. */
    public void verify(String authorization, String method, String path, String query, byte[] body,
            String requestId, String idempotencyKey) {
        try {
            if (authorization == null || !authorization.startsWith("Bearer ")) throw denied();
            SignedJWT token = SignedJWT.parse(authorization.substring(7));
            if (!JWSAlgorithm.RS256.equals(token.getHeader().getAlgorithm())
                    || !keyId.equals(token.getHeader().getKeyID()) || !token.verify(new RSASSAVerifier(keys.publicKey()))) throw denied();
            JWTClaimsSet claims = token.getJWTClaimsSet();
            validateIdentity(claims);
            validateBinding(claims, method, path, query, body, requestId, idempotencyKey);
            nonces.consume("ai-service", UUID.fromString(claims.getJWTID()), claims.getExpirationTime().toInstant());
        } catch (UnauthenticatedError error) { throw error; }
        catch (Exception error) { throw denied(); }
    }
    private void validateIdentity(JWTClaimsSet claims) throws java.text.ParseException {
        Instant now = Instant.now(clock);
        if (!"unichat-ai".equals(claims.getIssuer()) || !claims.getAudience().equals(java.util.List.of("unichat-core"))
                || !"ai-service".equals(claims.getSubject()) || !"private-core".equals(claims.getStringClaim("purpose"))
                || claims.getIssueTime() == null || claims.getExpirationTime() == null) throw denied();
        Instant issued = claims.getIssueTime().toInstant();
        Instant expiry = claims.getExpirationTime().toInstant();
        if (issued.isAfter(now) || !expiry.isAfter(now) || !expiry.isAfter(issued)
                || expiry.isAfter(issued.plusSeconds(60))) throw denied();
    }
    private void validateBinding(JWTClaimsSet claims, String method, String path, String query, byte[] body,
            String requestId, String idempotencyKey) throws java.text.ParseException {
        if (!method.equals(claims.getStringClaim("method")) || !path.equals(claims.getStringClaim("path"))
                || !Objects.requireNonNullElse(query, "").equals(claims.getStringClaim("query"))
                || !RequestBinding.hash(body).equals(claims.getStringClaim("bodyHash"))
                || requestId == null || !requestId.equals(claims.getStringClaim("requestId"))
                || !Objects.requireNonNullElse(idempotencyKey, "").equals(claims.getStringClaim("idempotencyKey"))) throw denied();
    }
    private UnauthenticatedError denied() { return new UnauthenticatedError("Danh tính dịch vụ không hợp lệ."); }
}
