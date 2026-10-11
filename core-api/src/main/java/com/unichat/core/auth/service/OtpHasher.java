package com.unichat.core.auth.service;

import java.nio.charset.StandardCharsets;
import java.security.GeneralSecurityException;
import java.security.MessageDigest;
import java.util.Base64;
import java.util.UUID;
import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

/** HMAC protects low-entropy OTPs from offline brute force of a database snapshot. */
@Component
public class OtpHasher {
    private final String secret;
    /** Secret is provisioned separately; absent configuration fails when OTP is used. */
    public OtpHasher(@Value("${OTP_HMAC_SECRET:}") String secret) { this.secret = secret; }
    /** Binds the digest to one challenge, normalized email and reset purpose. */
    public String digest(UUID challengeId, String email, String code) {
        if (secret.length() < 32) throw new IllegalStateException("OTP_HMAC_SECRET must contain at least 32 characters");
        try {
            Mac mac = Mac.getInstance("HmacSHA256");
            mac.init(new SecretKeySpec(secret.getBytes(StandardCharsets.UTF_8), "HmacSHA256"));
            String input = challengeId + "\n" + email + "\nPASSWORD_RESET\n" + code;
            return Base64.getEncoder().encodeToString(mac.doFinal(input.getBytes(StandardCharsets.UTF_8)));
        } catch (GeneralSecurityException error) {
            throw new IllegalStateException("HMAC unavailable", error);
        }
    }
    /** Uses constant-time digest comparison without logging code/hash values. */
    public boolean matches(String stored, UUID challengeId, String email, String code) {
        if (stored == null) return false;
        return MessageDigest.isEqual(stored.getBytes(StandardCharsets.UTF_8),
                digest(challengeId, email, code).getBytes(StandardCharsets.UTF_8));
    }
}
