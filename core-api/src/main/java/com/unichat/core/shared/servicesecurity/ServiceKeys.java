package com.unichat.core.shared.servicesecurity;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.security.KeyFactory;
import java.security.interfaces.RSAPrivateKey;
import java.security.interfaces.RSAPublicKey;
import java.security.spec.PKCS8EncodedKeySpec;
import java.security.spec.X509EncodedKeySpec;
import java.util.Base64;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.ResourceLoader;
import org.springframework.stereotype.Component;

/** Loads separate service identities without generated or shared-secret fallbacks. */
@Component
public class ServiceKeys {
    private final String privatePem;
    private final String publicPem;
    private final String privatePath;
    private final String publicPath;
    private final ResourceLoader resources;
    /** Reads configuration only; absent identities fail closed when used. */
    public ServiceKeys(@Value("${CORE_SERVICE_PRIVATE_KEY:}") String privatePem,
            @Value("${AI_SERVICE_PUBLIC_KEY:}") String publicPem,
            @Value("${CORE_SERVICE_PRIVATE_KEY_PATH:}") String privatePath,
            @Value("${AI_SERVICE_PUBLIC_KEY_PATH:}") String publicPath, ResourceLoader resources) {
        this.privatePem = privatePem; this.publicPem = publicPem;
        this.privatePath = privatePath; this.publicPath = publicPath; this.resources = resources;
    }
    /** Returns the configured Core signing identity. */
    public RSAPrivateKey privateKey() {
        try { return (RSAPrivateKey) KeyFactory.getInstance("RSA").generatePrivate(
                new PKCS8EncodedKeySpec(decode(read(privatePem, privatePath), "PRIVATE"))); }
        catch (Exception error) { throw new IllegalStateException("Core service signing key unavailable", error); }
    }
    /** Returns the configured AI verification identity. */
    public RSAPublicKey publicKey() {
        try { return (RSAPublicKey) KeyFactory.getInstance("RSA").generatePublic(
                new X509EncodedKeySpec(decode(read(publicPem, publicPath), "PUBLIC"))); }
        catch (Exception error) { throw new IllegalStateException("AI service verification key unavailable", error); }
    }
    private String read(String pem, String path) throws IOException {
        if (!pem.isBlank()) return pem.replace("\\n", "\n");
        if (path.isBlank()) throw new IllegalStateException("Service key not configured");
        String location = path.contains(":") && !path.matches("^[A-Za-z]:.*") ? path : "file:" + path;
        try {
            try (var stream = resources.getResource(location).getInputStream()) {
                return new String(stream.readAllBytes(), StandardCharsets.UTF_8);
            }
        } catch (IOException error) {
            if (!path.startsWith("/") && !path.matches("^[A-Za-z]:.*")) {
                try (var fallback = resources.getResource("file:../" + path).getInputStream()) {
                    return new String(fallback.readAllBytes(), StandardCharsets.UTF_8);
                } catch (IOException fallbackError) {
                    error.addSuppressed(fallbackError);
                }
            }
            throw error;
        }
    }
    private byte[] decode(String pem, String kind) {
        return Base64.getDecoder().decode(pem.replace("-----BEGIN " + kind + " KEY-----", "")
                .replace("-----END " + kind + " KEY-----", "").replaceAll("\\s", ""));
    }
}
