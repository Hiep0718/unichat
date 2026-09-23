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
        /** The name others see, chosen by the member. */
        String displayName,
        /** True when a picture was uploaded; otherwise a letter avatar is shown. */
        boolean hasAvatar,
        /** Chosen letter-avatar colour, or null to derive one from the name. */
        String avatarColor,
        SystemRole systemRole,
        UserStatus status,
        Instant createdAt
) {
    public static UserResponse from(User u) {
        return new UserResponse(
                u.getId(),
                u.getEmail(),
                u.getDisplayName(),
                u.hasAvatarImage(),
                u.getAvatarColor() == null ? null : u.getAvatarColor().key(),
                u.getSystemRole(),
                u.getStatus(),
                u.getCreatedAt()
        );
    }
}
