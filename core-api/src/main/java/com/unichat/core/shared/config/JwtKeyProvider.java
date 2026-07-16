package com.unichat.core.shared.config;

import java.io.InputStream;
import java.nio.charset.StandardCharsets;
import java.security.KeyFactory;
import java.security.KeyPair;
import java.security.KeyPairGenerator;
import java.security.interfaces.RSAPrivateKey;
import java.security.interfaces.RSAPublicKey;
import java.security.spec.PKCS8EncodedKeySpec;
import java.security.spec.X509EncodedKeySpec;
import java.util.Base64;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.ResourceLoader;
import org.springframework.stereotype.Component;

/**
 * Loads configured JWT RSA public/private keys or generates fallbacks.
 */
@Component
public class JwtKeyProvider {
    private static final Logger log = LoggerFactory.getLogger(JwtKeyProvider.class);

    private final RSAPublicKey publicKey;
    private final RSAPrivateKey privateKey;

    public JwtKeyProvider(
            @Value("${spring.security.oauth2.resourceserver.jwt.public-key-location:}") String publicKeyLocation,
            @Value("${security.jwt.private-key-location:}") String privateKeyLocation,
            ResourceLoader resourceLoader) {

        RSAPublicKey pub = null;
        RSAPrivateKey priv = null;

        try {
            if (publicKeyLocation != null && !publicKeyLocation.isBlank()) {
                var resource = resourceLoader.getResource(publicKeyLocation);
                if (resource.exists()) {
                    try (InputStream is = resource.getInputStream()) {
                        String pem = new String(is.readAllBytes(), StandardCharsets.UTF_8);
                        pub = parsePublicKey(pem);
                    }
                }
            }
            if (privateKeyLocation != null && !privateKeyLocation.isBlank()) {
                var resource = resourceLoader.getResource(privateKeyLocation);
                if (resource.exists()) {
                    try (InputStream is = resource.getInputStream()) {
                        String pem = new String(is.readAllBytes(), StandardCharsets.UTF_8);
                        priv = parsePrivateKey(pem);
                    }
                }
            }
        } catch (Exception e) {
            log.error("Failed to load configured JWT keys. Falling back to auto-generated keys.", e);
        }

        if (pub == null || priv == null) {
            log.warn("JWT keys not fully configured. Generating 2048-bit RSA key pair for local execution.");
            try {
                KeyPairGenerator kpg = KeyPairGenerator.getInstance("RSA");
                kpg.initialize(2048);
                KeyPair kp = kpg.generateKeyPair();
                pub = (RSAPublicKey) kp.getPublic();
                priv = (RSAPrivateKey) kp.getPrivate();
            } catch (Exception e) {
                throw new IllegalStateException("Failed to generate fallback RSA key pair", e);
            }
        }

        this.publicKey = pub;
        this.privateKey = priv;
    }

    public RSAPublicKey getPublicKey() {
        return publicKey;
    }

    public RSAPrivateKey getPrivateKey() {
        return privateKey;
    }

    private RSAPublicKey parsePublicKey(String pem) throws Exception {
        String base64 = pem
                .replace("-----BEGIN PUBLIC KEY-----", "")
                .replace("-----END PUBLIC KEY-----", "")
                .replaceAll("\\s", "");
        byte[] decoded = Base64.getDecoder().decode(base64);
        X509EncodedKeySpec spec = new X509EncodedKeySpec(decoded);
        KeyFactory kf = KeyFactory.getInstance("RSA");
        return (RSAPublicKey) kf.generatePublic(spec);
    }

    private RSAPrivateKey parsePrivateKey(String pem) throws Exception {
        String base64 = pem
                .replace("-----BEGIN PRIVATE KEY-----", "")
                .replace("-----END PRIVATE KEY-----", "")
                .replaceAll("\\s", "");
        byte[] decoded = Base64.getDecoder().decode(base64);
        PKCS8EncodedKeySpec spec = new PKCS8EncodedKeySpec(decoded);
        KeyFactory kf = KeyFactory.getInstance("RSA");
        return (RSAPrivateKey) kf.generatePrivate(spec);
    }
}
