package com.unichat.core.user.service;

import java.time.Clock;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.UUID;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.unichat.core.common.error.NotFoundError;
import com.unichat.core.user.api.UserResponse;
import com.unichat.core.user.domain.User;
import com.unichat.core.user.domain.UserRepository;
import com.unichat.core.user.domain.UserStatus;
import com.unichat.core.auth.service.TokenService;

/**
 * Handles profile retrievals and admin user status updates.
 */
@Service
public class UserService {

    private final UserRepository userRepository;
    private final Clock clock;
    private final org.springframework.security.crypto.password.PasswordEncoder passwordEncoder;
    private final TokenService tokenService;

    public UserService(UserRepository userRepository, Clock clock, org.springframework.security.crypto.password.PasswordEncoder passwordEncoder, TokenService tokenService) {
        this.userRepository = userRepository;
        this.clock = clock;
        this.passwordEncoder = passwordEncoder;
        this.tokenService = tokenService;
    }

    /**
     * Gets a user by ID.
     */
    @Transactional(readOnly = true)
    public UserResponse getUserById(UUID id) {
        User user = userRepository.findById(id)
                .orElseThrow(() -> new NotFoundError("Người dùng không tồn tại"));
        return UserResponse.from(user);
    }

    /**
     * Searches users (Admin action).
     */
    @Transactional(readOnly = true)
    public Page<UserResponse> searchUsers(String query, Pageable pageable) {
        return userRepository.searchUsers(query, pageable)
                .map(UserResponse::from);
    }

    /**
     * Updates account status (Admin action).
     */
    @Transactional
    public UserResponse updateStatus(UUID userId, UserStatus status) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new NotFoundError("Người dùng không tồn tại"));

        user.setStatus(status);
        if (UserStatus.ACTIVE.equals(status)) {
            user.setFailedLoginCount(0);
            user.setLockedUntil(null);
        } else {
            user.setLockedUntil(Instant.now(clock).plus(36500, ChronoUnit.DAYS)); // Indefinite lock
            tokenService.revokeAllTokensByUser(userId);
        }
        user.setUpdatedAt(Instant.now(clock));

        userRepository.save(user);
        return UserResponse.from(user);
    }

    /**
     * Changes the user's password.
     */
    @Transactional
    public void changePassword(UUID userId, com.unichat.core.user.api.ChangePasswordRequest request) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new NotFoundError("Người dùng không tồn tại"));

        if (!passwordEncoder.matches(request.currentPassword(), user.getPasswordHash())) {
            throw new com.unichat.core.common.error.ValidationError("Mật khẩu hiện tại không chính xác");
        }

        user.setPasswordHash(passwordEncoder.encode(request.newPassword()));
        user.setUpdatedAt(Instant.now(clock));
        userRepository.save(user);
    }
}
