package com.unichat.core.auth.config;

import java.io.IOException;
import java.util.Set;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.web.filter.OncePerRequestFilter;

/** Blocks hostile browser Origins before any cookie-based session mutation. */
public final class AuthOriginFilter extends OncePerRequestFilter {
    private final Set<String> origins;
    /** Receives the environment-driven exact origin allowlist. */
    public AuthOriginFilter(Set<String> origins) { this.origins = Set.copyOf(origins); }
    /** Validates only mutating auth requests; native requests have no browser Origin. */
    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain chain)
            throws ServletException, IOException {
        String origin = request.getHeader("Origin");
        boolean invalidOrigin = origin != null && !origins.contains(origin);
        boolean missingCookieOrigin = origin == null && hasRefreshCookie(request)
                && !"mobile".equalsIgnoreCase(request.getHeader("X-Client-Type"));
        if (invalidOrigin || missingCookieOrigin) {
            SecurityFailureResponder.write(response, request, 403, "FORBIDDEN", "Nguồn yêu cầu không được phép.");
            return;
        }
        chain.doFilter(request, response);
    }
    /** Ignores read-only requests and other product features. */
    @Override
    protected boolean shouldNotFilter(HttpServletRequest request) {
        return !request.getRequestURI().startsWith("/api/v1/auth/")
                || Set.of("GET", "HEAD", "OPTIONS").contains(request.getMethod());
    }
    /** Tests for browser session credentials without reading their contents. */
    public static boolean hasRefreshCookie(HttpServletRequest request) {
        if (request.getCookies() == null) return false;
        for (var cookie : request.getCookies()) if ("refresh_token".equals(cookie.getName())) return true;
        return false;
    }
}
