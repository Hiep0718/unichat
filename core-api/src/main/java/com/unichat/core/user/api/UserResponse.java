package com.unichat.core.user.api;

import java.time.Instant;
import java.util.UUID;

import com.unichat.core.user.domain.SystemRole;
import com.unichat.core.user.domain.User;
import com.unichat.core.user.domain.UserStatus;

/**
 * Output representation of a user profile.
 */
public record UserResponse(
    UUID id,
    String email,
    SystemRole systemRole,
    UserStatus status,
    Instant createdAt,
    Instant updatedAt
) {
    /**
     * Maps a User entity to a UserResponse DTO.
     */
    public static UserResponse from(User user) {
        return new UserResponse(
            user.getId(),
            user.getEmail(),
            user.getSystemRole(),
            user.getStatus(),
            user.getCreatedAt(),
            user.getUpdatedAt()
        );
    }
}
