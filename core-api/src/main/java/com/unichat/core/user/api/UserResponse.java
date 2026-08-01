package com.unichat.core.user.api;

import java.time.Instant;
import java.util.UUID;

import com.unichat.core.user.domain.SystemRole;
import com.unichat.core.user.domain.User;
import com.unichat.core.user.domain.UserStatus;

/**
 * Public response DTO for user profile and administrative management.
 */
public record UserResponse(
        UUID id,
        String email,
        SystemRole systemRole,
        UserStatus status,
        Instant createdAt
) {
    public static UserResponse from(User u) {
        return new UserResponse(
                u.getId(),
                u.getEmail(),
                u.getSystemRole(),
                u.getStatus(),
                u.getCreatedAt()
        );
    }
}
