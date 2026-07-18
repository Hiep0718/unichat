package com.unichat.core.admin.service;

import java.time.Clock;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.UUID;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.unichat.core.auth.service.TokenService;
import com.unichat.core.common.error.NotFoundError;
import com.unichat.core.user.api.UserResponse;
import com.unichat.core.user.domain.User;
import com.unichat.core.user.domain.UserRepository;
import com.unichat.core.user.domain.UserStatus;

/**
 * Handles admin-level user management operations.
 */
@Service
public class AdminService {

    private final UserRepository userRepository;
    private final TokenService tokenService;
    private final Clock clock;

    public AdminService(UserRepository userRepository, TokenService tokenService, Clock clock) {
        this.userRepository = userRepository;
        this.tokenService = tokenService;
        this.clock = clock;
    }

    /**
     * Searches users with optional query filter.
     */
    @Transactional(readOnly = true)
    public Page<UserResponse> searchUsers(String query, Pageable pageable) {
        return userRepository.searchUsers(query, pageable).map(UserResponse::from);
    }

    /**
     * Updates account status and handles lock/unlock side-effects.
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
            user.setLockedUntil(Instant.now(clock).plus(36500, ChronoUnit.DAYS));
            tokenService.revokeAllTokensByUser(userId);
        }
        user.setUpdatedAt(Instant.now(clock));
        userRepository.save(user);
        return UserResponse.from(user);
    }
}
