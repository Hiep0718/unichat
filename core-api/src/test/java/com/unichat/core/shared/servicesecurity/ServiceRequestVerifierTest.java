package com.unichat.core.shared.servicesecurity;

import java.nio.charset.StandardCharsets;
import java.security.KeyPair;
import java.security.KeyPairGenerator;
import java.security.interfaces.RSAPrivateKey;
import java.security.interfaces.RSAPublicKey;
import java.time.Clock;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.Date;
import java.util.UUID;
import com.nimbusds.jose.*;
import com.nimbusds.jose.crypto.RSASSASigner;
import com.nimbusds.jwt.JWTClaimsSet;
import com.nimbusds.jwt.SignedJWT;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import static org.mockito.Mockito.*;
import static org.junit.jupiter.api.Assertions.*;
import com.unichat.core.common.error.UnauthenticatedError;

class ServiceRequestVerifierTest {
    private static final Instant NOW=Instant.parse("2026-10-11T00:00:00Z");
    private static final String PATH="/internal/v1/provider-attempts";
    private static final byte[] BODY="{\"nộiDung\":\"tiếng Việt\"}".getBytes(StandardCharsets.UTF_8);
    private static KeyPair pair;
    private final ServiceKeys keys=mock(ServiceKeys.class);
    private final ServiceNonceService nonces=mock(ServiceNonceService.class);
    private ServiceRequestVerifier verifier;
    @BeforeAll static void createKeys() throws Exception {
        var generator=KeyPairGenerator.getInstance("RSA");generator.initialize(2048);pair=generator.generateKeyPair();
    }
    @BeforeEach void setUp() {
        when(keys.publicKey()).thenReturn((RSAPublicKey)pair.getPublic());
        verifier=new ServiceRequestVerifier(keys,nonces,Clock.fixed(NOW,ZoneOffset.UTC),"ai-service-v1");
    }
    private JWTClaimsSet.Builder claims() {
        return new JWTClaimsSet.Builder().issuer("unichat-ai").audience("unichat-core").subject("ai-service")
                .jwtID(UUID.randomUUID().toString()).issueTime(Date.from(NOW)).expirationTime(Date.from(NOW.plusSeconds(60)))
                .claim("purpose","private-core").claim("method","POST").claim("path",PATH).claim("query","")
                .claim("bodyHash",RequestBinding.hash(BODY)).claim("requestId","request-test").claim("idempotencyKey","");
    }
    private String sign(JWTClaimsSet claims) throws Exception {
        var token=new SignedJWT(new JWSHeader.Builder(JWSAlgorithm.RS256).keyID("ai-service-v1").build(),claims);
        token.sign(new RSASSASigner((RSAPrivateKey)pair.getPrivate()));return "Bearer "+token.serialize();
    }
    private void verify(String token,byte[] bytes) { verifier.verify(token,"POST",PATH,"",bytes,"request-test",""); }
    @Test void shouldConsumeNonceOnlyAfterActualSignatureAndByteBindingVerification() throws Exception {
        var claims=claims().build();verify(sign(claims),BODY);
        org.mockito.Mockito.verify(nonces).consume("ai-service",UUID.fromString(claims.getJWTID()),NOW.plusSeconds(60));
    }
    @Test void shouldRejectTamperedBodyAndBindingBeforeNonceConsumption() throws Exception {
        assertThrows(UnauthenticatedError.class,() -> verify(sign(claims().build()),"{}".getBytes(StandardCharsets.UTF_8)));
        for (String field:java.util.List.of("path","query","method","bodyHash","requestId","idempotencyKey","purpose")) {
            assertThrows(UnauthenticatedError.class,() -> verify(sign(claims().claim(field,"tampered").build()),BODY));
        }
        verifyNoInteractions(nonces);
    }
    @Test void shouldRejectExpiredFutureAndOverlongCredentials() {
        for (var claims:java.util.List.of(claims().expirationTime(Date.from(NOW)),
                claims().issueTime(Date.from(NOW.plusSeconds(1))),claims().expirationTime(Date.from(NOW.plusSeconds(61))))) {
            assertThrows(UnauthenticatedError.class,() -> verify(sign(claims.build()),BODY));
        }
        verifyNoInteractions(nonces);
    }
    @Test void shouldRejectUserAudienceStaticPrefixAndMissingAuthorization() throws Exception {
        assertThrows(UnauthenticatedError.class,() -> verify(sign(claims().audience("unichat-client").build()),BODY));
        assertThrows(UnauthenticatedError.class,() -> verify("Bearer unichat-internal-service-key-dev",BODY));
        assertThrows(UnauthenticatedError.class,() -> verify(null,BODY));verifyNoInteractions(nonces);
    }
}
