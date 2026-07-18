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
    public UserService(UserRepository userRepository, Clock clock, org.springframework.security.crypto.password.PasswordEncoder passwordEncoder) {
        this.userRepository = userRepository;
        this.clock = clock;
        this.passwordEncoder = passwordEncoder;
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
