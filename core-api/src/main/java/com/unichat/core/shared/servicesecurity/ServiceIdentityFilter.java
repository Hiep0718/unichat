package com.unichat.core.shared.servicesecurity;

import java.io.IOException;
import java.util.List;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.filter.OncePerRequestFilter;
import com.unichat.core.common.error.UnauthenticatedError;

/** Authenticates only bounded private service requests, never user/admin routes. */
public final class ServiceIdentityFilter extends OncePerRequestFilter {
    private static final int MAX_BODY_BYTES = 65536;
    private final ServiceRequestVerifier verifier;
    /** Receives the signature/binding verifier. */
    public ServiceIdentityFilter(ServiceRequestVerifier verifier) { this.verifier = verifier; }
    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain chain)
            throws ServletException, IOException {
        byte[] bytes = request.getInputStream().readNBytes(MAX_BODY_BYTES + 1);
        if (bytes.length > MAX_BODY_BYTES) { response.sendError(413); return; }
        try {
            verifier.verify(request.getHeader("Authorization"), request.getMethod(), request.getRequestURI(),
                    request.getQueryString(), bytes, request.getHeader("X-Request-Id"), request.getHeader("Idempotency-Key"));
            var identity = UsernamePasswordAuthenticationToken.authenticated("ai-service", null,
                    List.of(new SimpleGrantedAuthority("SERVICE_AI")));
            SecurityContextHolder.getContext().setAuthentication(identity);
            chain.doFilter(new ServiceBodyRequest(request, bytes), response);
        } catch (UnauthenticatedError error) {
            response.setStatus(401); response.setContentType("application/problem+json");
            response.getWriter().write("{\"status\":401,\"code\":\"UNAUTHENTICATED\",\"title\":\"Danh tính dịch vụ không hợp lệ\"}");
        } finally { SecurityContextHolder.clearContext(); }
    }
}
