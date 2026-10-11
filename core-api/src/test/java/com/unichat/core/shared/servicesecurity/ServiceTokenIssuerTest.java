package com.unichat.core.shared.servicesecurity;

import java.nio.charset.StandardCharsets;
import java.security.KeyPairGenerator;
import java.security.interfaces.RSAPrivateKey;
import java.security.interfaces.RSAPublicKey;
import java.time.Clock;
import java.time.Instant;
import java.time.ZoneOffset;
import org.junit.jupiter.api.Test;
import static org.mockito.Mockito.*;
import static org.junit.jupiter.api.Assertions.*;
import com.nimbusds.jose.crypto.RSASSAVerifier;
import com.nimbusds.jwt.SignedJWT;
import com.unichat.core.shared.config.ServiceTokenIssuer;

class ServiceTokenIssuerTest {
    @Test void shouldSignExactUtf8BytesAndImmutableRequestBinding() throws Exception {
        var generator=KeyPairGenerator.getInstance("RSA");generator.initialize(2048);var pair=generator.generateKeyPair();
        var keys=mock(ServiceKeys.class);when(keys.privateKey()).thenReturn((RSAPrivateKey)pair.getPrivate());
        var now=Instant.parse("2026-10-11T00:00:00Z");
        var issuer=new ServiceTokenIssuer(keys,Clock.fixed(now,ZoneOffset.UTC),"core-service-v1");
        byte[] body="{\"question\":\"tiếng Việt\"}".getBytes(StandardCharsets.UTF_8);
        var encoded=issuer.issueToken("POST","/internal/v1/retrieval/answers","a=1",body,"request-test","key-test");
        var token=SignedJWT.parse(encoded.substring(7));var claims=token.getJWTClaimsSet();
        assertTrue(token.verify(new RSASSAVerifier((RSAPublicKey)pair.getPublic())));
        assertEquals("core-service-v1",token.getHeader().getKeyID());assertEquals("unichat-core",claims.getIssuer());
        assertEquals(RequestBinding.hash(body),claims.getStringClaim("bodyHash"));assertEquals("a=1",claims.getStringClaim("query"));
        assertEquals("key-test",claims.getStringClaim("idempotencyKey"));
        assertEquals(now.plusSeconds(60),claims.getExpirationTime().toInstant());
    }
}
