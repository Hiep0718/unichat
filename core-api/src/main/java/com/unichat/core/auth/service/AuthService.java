package com.unichat.core.auth.service;

import java.time.Clock;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.UUID;

import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.unichat.core.auth.api.LoginRequest;
import com.unichat.core.auth.api.LoginResponse;
import com.unichat.core.auth.api.RegisterRequest;
import com.unichat.core.common.error.ConflictError;
import com.unichat.core.common.error.UnauthenticatedError;
import com.unichat.core.user.api.UserResponse;
import com.unichat.core.user.domain.SystemRole;
import com.unichat.core.user.domain.User;
import com.unichat.core.user.domain.UserRepository;
import com.unichat.core.user.domain.UserStatus;
import com.unichat.core.shared.util.UuidGenerator;

/**
 * Handles core identity operations including registration, login state, and refresh sessions.
 */
@Service
public class AuthService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final TokenService tokenService;
    private final Clock clock;

    public AuthService(
            UserRepository userRepository,
            PasswordEncoder passwordEncoder,
            TokenService tokenService,
            Clock clock) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
        this.tokenService = tokenService;
        this.clock = clock;
    }

    /**
     * Registers a new user.
     */
    @Transactional
    public UserResponse register(RegisterRequest request) {
        if (userRepository.existsByEmailIgnoreCase(request.email())) {
            throw new ConflictError("Email đã được sử dụng trên hệ thống.");
        }

        Instant now = Instant.now(clock);
        User user = new User(
                UuidGenerator.generateV7(),
                request.email(),
                passwordEncoder.encode(request.password()),
                SystemRole.USER,
                UserStatus.ACTIVE,
                now
        );

        userRepository.save(user);
        return UserResponse.from(user);
    }

    /**
     * Authenticates credentials and issues tokens.
     */
    @Transactional
    public TokenPair login(LoginRequest request) {
        Instant now = Instant.now(clock);
        User user = userRepository.findByEmailIgnoreCase(request.email())
                .orElseThrow(() -> new UnauthenticatedError("Tài khoản hoặc mật khẩu không chính xác"));

        // Check if account is locked
        if (UserStatus.LOCKED.equals(user.getStatus()) || (user.getLockedUntil() != null && user.getLockedUntil().isAfter(now))) {
            if (user.getLockedUntil() != null && user.getLockedUntil().isBefore(now)) {
                // Auto-unlock
                user.setStatus(UserStatus.ACTIVE);
                user.setFailedLoginCount(0);
                user.setLockedUntil(null);
            } else {
                throw new UnauthenticatedError("Tài khoản đã bị khóa. Vui lòng thử lại sau.");
            }
        }

        // Verify password
        if (!passwordEncoder.matches(request.password(), user.getPasswordHash())) {
            int attempts = user.getFailedLoginCount() + 1;
            user.setFailedLoginCount(attempts);
            if (attempts >= 5) {
                user.setStatus(UserStatus.LOCKED);
                user.setLockedUntil(now.plus(15, ChronoUnit.MINUTES));
            }
            userRepository.save(user);
            throw new UnauthenticatedError("Tài khoản hoặc mật khẩu không chính xác");
        }

        // Success - reset counters
        user.setFailedLoginCount(0);
        user.setLockedUntil(null);
        userRepository.save(user);

        String accessToken = tokenService.generateAccessToken(user);
        UUID familyId = UUID.randomUUID();
        String refreshToken = tokenService.createRefreshToken(user.getId(), familyId);

        return new TokenPair(accessToken, refreshToken);
    }

    /**
     * Performs refresh token rotation and generates a new access token.
     */
    @Transactional
    public TokenPair refresh(String rawRefreshToken) {
        String nextRawRefreshToken = tokenService.rotateRefreshToken(rawRefreshToken);
        UUID userId = tokenService.getUserIdFromRefreshToken(nextRawRefreshToken);
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new UnauthenticatedError("Người dùng không tồn tại"));

        if (UserStatus.LOCKED.equals(user.getStatus())) {
            throw new UnauthenticatedError("Tài khoản đang bị khóa");
        }

        String accessToken = tokenService.generateAccessToken(user);
        return new TokenPair(accessToken, nextRawRefreshToken);
    }

    /**
     * Revokes all tokens in the session.
     */
    @Transactional
    public void logout(String rawRefreshToken) {
        if (rawRefreshToken != null && !rawRefreshToken.isBlank()) {
            tokenService.revokeFamily(rawRefreshToken);
        }
    }

    /**
     * Container holding access and refresh token pair.
     */
    public record TokenPair(String accessToken, String refreshToken) {}
}
