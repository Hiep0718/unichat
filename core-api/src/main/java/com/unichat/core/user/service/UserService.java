package com.unichat.core.user.service;

import java.time.Clock;
import java.time.Instant;
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

/**
 * Handles profile retrievals and admin user status updates.
 */
@Service
public class UserService {

    private final UserRepository userRepository;
    private final Clock clock;

    public UserService(UserRepository userRepository, Clock clock) {
        this.userRepository = userRepository;
        this.clock = clock;
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
            user.setLockedUntil(Instant.now(clock).plus(100, ChronoUnit.YEARS)); // Indefinite lock
        }
        user.setUpdatedAt(Instant.now(clock));

        userRepository.save(user);
        return UserResponse.from(user);
    }

    private static class ChronoUnit {
        private static final java.time.temporal.ChronoUnit YEARS = java.time.temporal.ChronoUnit.YEARS;
    }
}
