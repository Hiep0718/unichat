package com.unichat.core.shared.servicesecurity;

import static org.junit.jupiter.api.Assertions.assertArrayEquals;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.security.KeyPair;
import java.security.KeyPairGenerator;
import java.time.Clock;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.Base64;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;
import org.springframework.core.io.DefaultResourceLoader;

import com.nimbusds.jose.crypto.RSASSAVerifier;
import com.nimbusds.jwt.SignedJWT;
import com.unichat.core.shared.config.ServiceTokenIssuer;

class ServiceKeysTest {
    private static final String PRIVATE_KEY_TYPE = "PRIVATE";
    private static final String PUBLIC_KEY_TYPE = "PUBLIC";

    private final DefaultResourceLoader resources = new DefaultResourceLoader();

    @TempDir
    Path temporaryDirectory;

    @Test
    void shouldLoadGeneratedKeysFromTemporaryPaths() throws Exception {
        KeyPair keyPair = generateKeyPair();
        Path privatePath = writePem("core-private.pem", PRIVATE_KEY_TYPE, keyPair.getPrivate().getEncoded());
        Path publicPath = writePem("ai-public.pem", PUBLIC_KEY_TYPE, keyPair.getPublic().getEncoded());
        ServiceKeys keys = new ServiceKeys("", "", privatePath.toString(), publicPath.toString(), resources);

        byte[] loadedPrivateKey = keys.privateKey().getEncoded();
        byte[] loadedPublicKey = keys.publicKey().getEncoded();

        assertArrayEquals(keyPair.getPrivate().getEncoded(), loadedPrivateKey);
        assertArrayEquals(keyPair.getPublic().getEncoded(), loadedPublicKey);
    }

    @Test
    void shouldLoadGeneratedKeysFromEscapedInlinePemStrings() throws Exception {
        KeyPair keyPair = generateKeyPair();
        String privatePem = escapedPem(PRIVATE_KEY_TYPE, keyPair.getPrivate().getEncoded());
        String publicPem = escapedPem(PUBLIC_KEY_TYPE, keyPair.getPublic().getEncoded());
        ServiceKeys keys = new ServiceKeys(privatePem, publicPem, "", "", resources);

        byte[] loadedPrivateKey = keys.privateKey().getEncoded();
        byte[] loadedPublicKey = keys.publicKey().getEncoded();

        assertArrayEquals(keyPair.getPrivate().getEncoded(), loadedPrivateKey);
        assertArrayEquals(keyPair.getPublic().getEncoded(), loadedPublicKey);
    }

    @Test
    void shouldSignAndVerifyWithGeneratedTemporaryKeys() throws Exception {
        KeyPair keyPair = generateKeyPair();
        Path privatePath = writePem("core-private.pem", PRIVATE_KEY_TYPE, keyPair.getPrivate().getEncoded());
        Path publicPath = writePem("core-public.pem", PUBLIC_KEY_TYPE, keyPair.getPublic().getEncoded());
        ServiceKeys signingKeys = new ServiceKeys("", "", privatePath.toString(), "", resources);
        ServiceKeys verificationKeys = new ServiceKeys("", "", "", publicPath.toString(), resources);
        Instant now = Instant.parse("2026-10-21T00:00:00Z");
        ServiceTokenIssuer issuer = new ServiceTokenIssuer(
                signingKeys, Clock.fixed(now, ZoneOffset.UTC), "core-service-v1");
        byte[] body = "{\"test\":true}".getBytes(StandardCharsets.UTF_8);

        String authorization = issuer.issueToken(
                "POST", "/internal/v1/test", "", body, "req-1", "key-1");
        SignedJWT token = SignedJWT.parse(authorization.substring("Bearer ".length()));

        assertTrue(authorization.startsWith("Bearer "));
        assertTrue(token.verify(new RSASSAVerifier(verificationKeys.publicKey())));
        assertEquals("core-service-v1", token.getHeader().getKeyID());
        assertEquals("unichat-core", token.getJWTClaimsSet().getIssuer());
    }

    @Test
    void shouldFailClosedWhenKeysAreUnconfigured() {
        ServiceKeys keys = new ServiceKeys("", "", "", "", resources);

        IllegalStateException privateError = assertThrows(IllegalStateException.class, keys::privateKey);
        IllegalStateException publicError = assertThrows(IllegalStateException.class, keys::publicKey);

        assertEquals("Core service signing key unavailable", privateError.getMessage());
        assertEquals("AI service verification key unavailable", publicError.getMessage());
    }

    @Test
    void shouldFailClosedWhenConfiguredKeyPathsAreMissing() {
        Path missingPrivatePath = temporaryDirectory.resolve("missing-private.pem");
        Path missingPublicPath = temporaryDirectory.resolve("missing-public.pem");
        ServiceKeys keys = new ServiceKeys(
                "", "", missingPrivatePath.toString(), missingPublicPath.toString(), resources);

        IllegalStateException privateError = assertThrows(IllegalStateException.class, keys::privateKey);
        IllegalStateException publicError = assertThrows(IllegalStateException.class, keys::publicKey);

        assertEquals("Core service signing key unavailable", privateError.getMessage());
        assertEquals("AI service verification key unavailable", publicError.getMessage());
    }

    private KeyPair generateKeyPair() throws Exception {
        KeyPairGenerator generator = KeyPairGenerator.getInstance("RSA");
        generator.initialize(2048);
        return generator.generateKeyPair();
    }

    private Path writePem(String fileName, String keyType, byte[] encodedKey) throws Exception {
        Path path = temporaryDirectory.resolve(fileName);
        return Files.writeString(path, pem(keyType, encodedKey), StandardCharsets.UTF_8);
    }

    private String escapedPem(String keyType, byte[] encodedKey) {
        return pem(keyType, encodedKey).replace("\n", "\\n");
    }

    private String pem(String keyType, byte[] encodedKey) {
        String base64 = Base64.getMimeEncoder(64, "\n".getBytes(StandardCharsets.US_ASCII))
                .encodeToString(encodedKey);
        return "-----BEGIN " + keyType + " KEY-----\n"
                + base64 + "\n-----END " + keyType + " KEY-----\n";
    }
}
