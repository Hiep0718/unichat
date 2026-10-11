package com.unichat.core.shared.config;

import java.io.InputStream;
import java.nio.charset.StandardCharsets;
import java.security.KeyFactory;
import java.security.KeyPairGenerator;
import java.security.interfaces.RSAPrivateKey;
import java.security.interfaces.RSAPublicKey;
import java.security.spec.PKCS8EncodedKeySpec;
import java.security.spec.X509EncodedKeySpec;
import java.util.Base64;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.Resource;
import org.springframework.core.io.ResourceLoader;
import org.springframework.stereotype.Component;

/** Loads configured RS256 keys; ephemeral keys require an explicitly local profile. */
@Component
public class JwtKeyProvider {
    private static final Logger LOGGER = LoggerFactory.getLogger(JwtKeyProvider.class);
    private final RSAPublicKey publicKey;
    private final RSAPrivateKey privateKey;

    /** Invalid deployment key material fails startup without exposing PEMs or paths. */
    public JwtKeyProvider(
            @Value("${spring.security.oauth2.resourceserver.jwt.public-key-location:}") String publicLocation,
            @Value("${security.jwt.private-key-location:}") String privateLocation,
            ResourceLoader loader, @Value("${UNICHAT_SECURITY_PROFILE:${APP_ENV:}}") String profile) {
        KeyMaterial material = load(publicLocation, privateLocation, loader, "local".equals(profile));
        publicKey = material.publicKey(); privateKey = material.privateKey();
    }
    /** Public RS256 verification key. */
    public RSAPublicKey getPublicKey() { return publicKey; }
    /** Signing key, never serialized or logged. */
    public RSAPrivateKey getPrivateKey() { return privateKey; }

    private KeyMaterial load(String publicLocation, String privateLocation, ResourceLoader loader, boolean local) {
        boolean missing = publicLocation == null || publicLocation.isBlank() || privateLocation == null || privateLocation.isBlank();
        if (missing) {
            if (local) {
                LOGGER.warn("jwt_partial_key_config_ignored operation=initialize_security profile=local");
                return generateLocal();
            }
            throw new IllegalStateException("RS256 public and private keys must both be configured");
        }
        try {
            RSAPublicKey publicPart = parsePublic(read(loader.getResource(publicLocation)));
            RSAPrivateKey privatePart = parsePrivate(read(loader.getResource(privateLocation)));
            if (!publicPart.getModulus().equals(privatePart.getModulus()) || publicPart.getModulus().bitLength() < 2048)
                throw new IllegalStateException("Invalid RS256 key pair");
            return new KeyMaterial(publicPart, privatePart);
        } catch (Exception error) {
            throw new IllegalStateException("Configured RS256 key material is unavailable or invalid");
        }
    }
    private String read(Resource resource) throws java.io.IOException {
        try (InputStream stream = resource.getInputStream()) {
            return new String(stream.readAllBytes(), StandardCharsets.UTF_8);
        }
    }
    private KeyMaterial generateLocal() {
        LOGGER.warn("jwt_ephemeral_keys operation=initialize_security profile=local");
        try {
            KeyPairGenerator generator = KeyPairGenerator.getInstance("RSA"); generator.initialize(2048);
            var pair = generator.generateKeyPair();
            return new KeyMaterial((RSAPublicKey) pair.getPublic(), (RSAPrivateKey) pair.getPrivate());
        } catch (java.security.GeneralSecurityException error) {
            throw new IllegalStateException("RS256 key generation unavailable", error);
        }
    }
    private RSAPublicKey parsePublic(String pem) throws java.security.GeneralSecurityException {
        byte[] encoded = decode(pem, "PUBLIC KEY");
        return (RSAPublicKey) KeyFactory.getInstance("RSA").generatePublic(new X509EncodedKeySpec(encoded));
    }
    private RSAPrivateKey parsePrivate(String pem) throws java.security.GeneralSecurityException {
        byte[] encoded = decode(pem, "PRIVATE KEY");
        return (RSAPrivateKey) KeyFactory.getInstance("RSA").generatePrivate(new PKCS8EncodedKeySpec(encoded));
    }
    private byte[] decode(String pem, String label) {
        return Base64.getDecoder().decode(pem.replace("-----BEGIN " + label + "-----", "")
                .replace("-----END " + label + "-----", "").replaceAll("\\s", ""));
    }
    private record KeyMaterial(RSAPublicKey publicKey, RSAPrivateKey privateKey) { }
}
