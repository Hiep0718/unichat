package com.unichat.core.auth.api;

import jakarta.servlet.http.HttpServletRequest;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseCookie;
import org.springframework.stereotype.Component;

/** Keeps browser cookies and native refresh bodies as separate transport branches. */
@Component
public class AuthTransport {
    private final boolean secure;
    /** HTTPS cookies are mandatory outside the explicitly configured local profile. */
    public AuthTransport(@Value("${UNICHAT_SECURITY_PROFILE:${APP_ENV:local}}") String profile) {
        secure = !"local".equals(profile);
    }
    /** Native credentials are never returned to a browser Origin. */
    public boolean isNative(String clientType, HttpServletRequest request) {
        if (clientType == null || clientType.isBlank() || "web".equals(clientType)) return false;
        if (!"mobile".equalsIgnoreCase(clientType) || request.getHeader("Origin") != null)
            throw new InvalidTransportError();
        if (com.unichat.core.auth.config.AuthOriginFilter.hasRefreshCookie(request)) throw new InvalidTransportError();
        return true;
    }
    /** Rejects mixed cookie/body requests even if their token values happen to match. */
    public String refreshCredential(String cookie, String body, boolean nativeClient) {
        if (cookie != null && body != null) throw new InvalidTransportError();
        if (nativeClient && cookie != null) throw new InvalidTransportError();
        if (body != null && !nativeClient) throw new InvalidTransportError();
        if (cookie != null && !cookie.isEmpty() && (cookie.length() < 32 || cookie.length() > 512
                || !cookie.matches("[A-Za-z0-9_-]+"))) throw new InvalidTransportError();
        return nativeClient ? body : cookie;
    }
    /** Builds the cookie for creation/rotation or explicit deletion. */
    public ResponseCookie cookie(String token, long seconds) {
        return ResponseCookie.from("refresh_token", token).httpOnly(true).secure(secure)
                .path("/api/v1/auth").sameSite("Strict").maxAge(seconds).build();
    }
}
