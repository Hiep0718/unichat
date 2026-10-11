package com.unichat.core.auth.api;

import java.time.Duration;
import java.util.UUID;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.web.csrf.CsrfToken;
import org.springframework.web.bind.annotation.CookieValue;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import com.unichat.core.auth.config.JwtProperties;
import com.unichat.core.auth.service.AuthService;
import com.unichat.core.auth.service.AuthService.TokenPair;
import com.unichat.core.common.error.UnauthenticatedError;
import com.unichat.core.common.error.ValidationError;
import com.unichat.core.shared.idempotency.IdempotencyService;
import com.unichat.core.shared.ratelimit.RateLimitService;
import com.unichat.core.user.api.UserResponse;

/** Validated session endpoints with separate browser and native transport branches. */
@RestController
@RequestMapping("/api/v1/auth")
public class AuthController {
    private final AuthService auth;
    private final IdempotencyService idempotency;
    private final JwtProperties properties;
    private final AuthTransport transport;
    private final RateLimitService limits;
    /** Composes HTTP transport, durable limits and transactional identity services. */
    public AuthController(AuthService auth, IdempotencyService idempotency, JwtProperties properties,
            AuthTransport transport, RateLimitService limits) {
        this.auth = auth; this.idempotency = idempotency; this.properties = properties;
        this.transport = transport; this.limits = limits;
    }
    /** Obtains the production double-submit token before browser cookie mutations. */
    @GetMapping("/csrf")
    public CsrfResponse csrf(HttpServletRequest request) {
        Object attribute = request.getAttribute(CsrfToken.class.getName());
        if (attribute instanceof CsrfToken token) return new CsrfResponse(token.getToken(), token.getHeaderName());
        return new CsrfResponse(null, "X-XSRF-TOKEN");
    }
    /** Registers an account; an optional UUID idempotency key preserves the existing API. */
    @PostMapping("/register")
    public ResponseEntity<?> register(@Valid @RequestBody RegisterRequest request,
            @RequestHeader(value = "Idempotency-Key", required = false) String key, HttpServletRequest servletRequest) {
        validateKey(key);
        if (key != null) {
            String hash = idempotency.computeHash(request);
            var existing = idempotency.getRecord("anonymous", "/auth/register", key);
            if (existing.isPresent()) {
                idempotency.handleConflict(existing.get(), hash);
                return ResponseEntity.status(existing.get().getResponseStatus())
                        .contentType(MediaType.APPLICATION_JSON).body(existing.get().getResponseBody());
            }
        }
        limit(servletRequest, request.email(), "register");
        UserResponse response = auth.register(request);
        if (key != null) idempotency.saveRecord("anonymous", "/auth/register", key,
                idempotency.computeHash(request), 201, response);
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }
    /** Browser refresh credentials never enter the response body. */
    @PostMapping("/login")
    public ResponseEntity<?> login(@Valid @RequestBody LoginRequest request,
            @RequestHeader(value = "X-Client-Type", required = false) String clientType, HttpServletRequest servletRequest) {
        boolean nativeClient = transport.isNative(clientType, servletRequest);
        limit(servletRequest, request.email(), "login");
        return tokenResponse(auth.login(request), nativeClient);
    }
    /** Rejects mixed transport before rotating a credential. */
    @PostMapping("/refresh")
    public ResponseEntity<?> refresh(@CookieValue(name = "refresh_token", required = false) String cookie,
            @Valid @RequestBody(required = false) RefreshFromBodyRequest body,
            @RequestHeader(value = "X-Client-Type", required = false) String clientType, HttpServletRequest request) {
        boolean nativeClient = transport.isNative(clientType, request);
        String raw = transport.refreshCredential(cookie, body == null ? null : body.refreshToken(), nativeClient);
        if (raw == null || raw.isBlank()) throw new UnauthenticatedError("Phiên đăng nhập không còn hợp lệ.");
        return tokenResponse(auth.refresh(raw), nativeClient);
    }
    /** Naturally idempotent family revocation; no raw token is stored as an idempotency hash. */
    @PostMapping("/logout")
    public ResponseEntity<Void> logout(@CookieValue(name = "refresh_token", required = false) String cookie,
            @Valid @RequestBody(required = false) LogoutFromBodyRequest body,
            @RequestHeader(value = "X-Client-Type", required = false) String clientType, HttpServletRequest request) {
        boolean nativeClient = transport.isNative(clientType, request);
        String raw = transport.refreshCredential(cookie, body == null ? null : body.refreshToken(), nativeClient);
        auth.logout(raw);
        if (nativeClient) return ResponseEntity.noContent().build();
        return ResponseEntity.noContent().header(HttpHeaders.SET_COOKIE, transport.cookie("", 0).toString()).build();
    }
    /** Returns the same public result for missing accounts, cooldown and SMTP failure. */
    @PostMapping("/forgot-password")
    public ResponseEntity<Void> forgotPassword(@Valid @RequestBody ForgotPasswordRequest body, HttpServletRequest request) {
        limit(request, body.email(), "forgot-password");
        auth.requestPasswordReset(body);
        return ResponseEntity.ok().build();
    }
    /** Verifies six ASCII digits and consumes one challenge atomically. */
    @PostMapping("/reset-password")
    public ResponseEntity<Void> resetPassword(@Valid @RequestBody ResetPasswordRequest body, HttpServletRequest request) {
        limit(request, body.email(), "reset-password");
        auth.resetPassword(body);
        return ResponseEntity.ok().build();
    }
    private ResponseEntity<?> tokenResponse(TokenPair pair, boolean nativeClient) {
        int expiry = Math.min(900, properties.accessTokenTtlSeconds());
        if (nativeClient) return ResponseEntity.ok(new MobileLoginResponse(pair.accessToken(), pair.refreshToken(), "Bearer", expiry));
        return ResponseEntity.ok().header(HttpHeaders.SET_COOKIE, transport.cookie(pair.refreshToken(), 604800).toString())
                .body(new LoginResponse(pair.accessToken(), "Bearer", expiry));
    }
    private void limit(HttpServletRequest request, String email, String action) {
        limits.consume("ip:" + request.getRemoteAddr(), "auth." + action, 5, Duration.ofMinutes(1));
        limits.consume("account:" + email.strip().toLowerCase(java.util.Locale.ROOT), "auth." + action, 5, Duration.ofMinutes(1));
    }
    private void validateKey(String key) {
        if (key == null) return;
        try { UUID.fromString(key); }
        catch (IllegalArgumentException error) { throw new ValidationError("Idempotency-Key phải là UUID."); }
    }
    /** A null token explicitly signals the local CSRF exception. */
    public record CsrfResponse(String token, String headerName) { }
}