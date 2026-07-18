package com.unichat.core.auth.api;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;

import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseCookie;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.CookieValue;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.unichat.core.auth.service.AuthService;
import com.unichat.core.auth.service.AuthService.TokenPair;
import com.unichat.core.shared.idempotency.IdempotencyService;
import com.unichat.core.user.api.UserResponse;
import com.unichat.core.auth.config.JwtProperties;

/**
 * Controller exposing OAuth2 session management endpoints.
 */
@RestController
@RequestMapping("/api/v1/auth")
public class AuthController {

    private final AuthService authService;
    private final IdempotencyService idempotencyService;
    private final JwtProperties jwtProperties;

    public AuthController(AuthService authService, IdempotencyService idempotencyService, JwtProperties jwtProperties) {
        this.authService = authService;
        this.idempotencyService = idempotencyService;
        this.jwtProperties = jwtProperties;
    }

    /**
     * Registers a new user account.
     */
    @PostMapping("/register")
    public ResponseEntity<?> register(
            @Valid @RequestBody RegisterRequest request,
            @RequestHeader(value = "Idempotency-Key", required = false) String idempotencyKey) {

        String actorId = "anonymous";
        String routeKey = "/auth/register";

        if (idempotencyKey != null && !idempotencyKey.isBlank()) {
            String currentHash = idempotencyService.computeHash(request);
            var recordOpt = idempotencyService.getRecord(actorId, routeKey, idempotencyKey);
            if (recordOpt.isPresent()) {
                var record = recordOpt.get();
                idempotencyService.handleConflict(record, currentHash);
                return ResponseEntity.status(record.getResponseStatus())
                        .header(HttpHeaders.CONTENT_TYPE, MediaType.APPLICATION_JSON_VALUE)
                        .body(record.getResponseBody());
            }

            UserResponse response = authService.register(request);
            idempotencyService.saveRecord(actorId, routeKey, idempotencyKey, currentHash, 201, response);
            return ResponseEntity.status(HttpStatus.CREATED).body(response);
        }

        UserResponse response = authService.register(request);
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    /**
     * Authenticates user credentials and places a secure refresh cookie.
     */
    @PostMapping("/login")
    public ResponseEntity<LoginResponse> login(@Valid @RequestBody LoginRequest request) {
        TokenPair pair = authService.login(request);

        ResponseCookie cookie = ResponseCookie.from("refresh_token", pair.refreshToken())
                .httpOnly(true)
                .secure(true)
                .path("/api/v1/auth")
                .maxAge(604800) // 7 days
                .sameSite("Strict")
                .build();

        return ResponseEntity.ok()
                .header(HttpHeaders.SET_COOKIE, cookie.toString())
                .body(new LoginResponse(pair.accessToken(), "Bearer", jwtProperties.accessTokenTtlSeconds()));
    }

    /**
     * Rotates refresh token and returns a new access token.
     */
    @PostMapping("/refresh")
    public ResponseEntity<LoginResponse> refresh(
            @CookieValue(name = "refresh_token", required = false) String rawRefreshToken) {
        if (rawRefreshToken == null || rawRefreshToken.isBlank()) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }

        TokenPair pair = authService.refresh(rawRefreshToken);

        ResponseCookie cookie = ResponseCookie.from("refresh_token", pair.refreshToken())
                .httpOnly(true)
                .secure(true)
                .path("/api/v1/auth")
                .maxAge(604800)
                .sameSite("Strict")
                .build();

        return ResponseEntity.ok()
                .header(HttpHeaders.SET_COOKIE, cookie.toString())
                .body(new LoginResponse(pair.accessToken(), "Bearer", jwtProperties.accessTokenTtlSeconds()));
    }

    /**
     * Logs out the user and revokes the active session.
     */
    @PostMapping("/logout")
    public ResponseEntity<?> logout(
            @CookieValue(name = "refresh_token", required = false) String rawRefreshToken,
            @RequestHeader(value = "Idempotency-Key", required = false) String idempotencyKey) {

        String actorId = "anonymous";
        String routeKey = "/auth/logout";

        if (idempotencyKey != null && !idempotencyKey.isBlank()) {
            String currentHash = rawRefreshToken != null ? rawRefreshToken : "";
            var recordOpt = idempotencyService.getRecord(actorId, routeKey, idempotencyKey);
            if (recordOpt.isPresent()) {
                var record = recordOpt.get();
                idempotencyService.handleConflict(record, currentHash);
                return ResponseEntity.status(record.getResponseStatus())
                        .header(HttpHeaders.CONTENT_TYPE, MediaType.APPLICATION_JSON_VALUE)
                        .body(record.getResponseBody());
            }

            authService.logout(rawRefreshToken);

            ResponseCookie cookie = ResponseCookie.from("refresh_token", "")
                    .httpOnly(true)
                    .secure(true)
                    .path("/api/v1/auth")
                    .maxAge(0)
                    .sameSite("Strict")
                    .build();

            idempotencyService.saveRecord(actorId, routeKey, idempotencyKey, currentHash, 204, "");

            return ResponseEntity.noContent()
                    .header(HttpHeaders.SET_COOKIE, cookie.toString())
                    .build();
        }

        authService.logout(rawRefreshToken);

        ResponseCookie cookie = ResponseCookie.from("refresh_token", "")
                .httpOnly(true)
                .secure(true)
                .path("/api/v1/auth")
                .maxAge(0)
                .sameSite("Strict")
                .build();

        return ResponseEntity.noContent()
                .header(HttpHeaders.SET_COOKIE, cookie.toString())
                .build();
    }

    /**
     * Initiates the forgot password flow by generating and saving an OTP.
     */
    @PostMapping("/forgot-password")
    public ResponseEntity<Void> forgotPassword(@Valid @RequestBody ForgotPasswordRequest request) {
        authService.requestPasswordReset(request);
        return ResponseEntity.ok().build();
    }

    /**
     * Verifies the OTP and updates the password.
     */
    @PostMapping("/reset-password")
    public ResponseEntity<Void> resetPassword(@Valid @RequestBody ResetPasswordRequest request) {
        authService.resetPassword(request);
        return ResponseEntity.ok().build();
    }
}
