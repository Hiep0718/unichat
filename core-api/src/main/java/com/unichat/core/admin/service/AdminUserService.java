package com.unichat.core.admin.service;

import java.time.Clock;
import java.time.Instant;
import java.util.UUID;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.unichat.core.common.error.AuthorizationError;
import com.unichat.core.common.error.NotFoundError;
import com.unichat.core.user.api.UserResponse;
import com.unichat.core.user.domain.SystemRole;
import com.unichat.core.user.domain.User;
import com.unichat.core.user.domain.UserRepository;
import com.unichat.core.user.domain.UserStatus;

/**
 * Service providing administrative user management operations.
 */
@Service
public class AdminUserService {

    private final UserRepository userRepository;
    private final Clock clock;

    public AdminUserService(UserRepository userRepository, Clock clock) {
        this.userRepository = userRepository;
        this.clock = clock;
    }

    /**
     * Lists and searches all registered users in system.
     */
    @Transactional(readOnly = true)
    public Page<UserResponse> getUsers(UUID adminUserId, String query, Pageable pageable) {
        validateAdmin(adminUserId);
        return userRepository.searchUsers(query, pageable).map(UserResponse::from);
    }

    /**
     * Updates account status (e.g. LOCK or UNLOCK user).
     */
    @Transactional
    public UserResponse updateUserStatus(UUID adminUserId, UUID targetUserId, UserStatus newStatus) {
        validateAdmin(adminUserId);

        User targetUser = userRepository.findById(targetUserId)
                .orElseThrow(() -> new NotFoundError("Người dùng không tồn tại"));

        targetUser.setStatus(newStatus);
        targetUser.setUpdatedAt(Instant.now(clock));
        userRepository.save(targetUser);

        return UserResponse.from(targetUser);
    }

    private void validateAdmin(UUID adminUserId) {
        User admin = userRepository.findById(adminUserId)
                .orElseThrow(() -> new AuthorizationError("Quyền truy cập bị từ chối. Chỉ dành cho Quản trị viên"));

        if (admin.getSystemRole() != SystemRole.ADMIN) {
            throw new AuthorizationError("Quyền truy cập bị từ chối. Chỉ dành cho Quản trị viên");
        }
    }
}
