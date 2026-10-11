package com.unichat.core.admin.service;

import java.time.Clock;
import java.time.Instant;
import java.util.UUID;
import jakarta.persistence.EntityManager;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import com.unichat.core.auth.service.TokenService;
import com.unichat.core.common.error.AuthorizationError;
import com.unichat.core.common.error.ConflictError;
import com.unichat.core.common.error.NotFoundError;
import com.unichat.core.common.error.ValidationError;
import com.unichat.core.user.api.UserResponse;
import com.unichat.core.user.domain.SystemRole;
import com.unichat.core.user.domain.User;
import com.unichat.core.user.domain.UserRepository;
import com.unichat.core.user.domain.UserStatus;

/** Account administration with live-role authorization and serialized admin invariants. */
@Service
public class AdminUserService {
    private static final long ADMIN_MUTATION_LOCK = 0x554E4941444D0001L;
    private final UserRepository users;
    private final TokenService tokens;
    private final AuditService audit;
    private final EntityManager entityManager;
    private final Clock clock;
    /** Uses one transaction lock for mutations that could remove an active administrator. */
    public AdminUserService(UserRepository users, Clock clock, TokenService tokens,
            AuditService audit, EntityManager entityManager) {
        this.users = users; this.clock = clock; this.tokens = tokens;
        this.audit = audit; this.entityManager = entityManager;
    }
    /** Lists bounded profiles for a currently active administrator. */
    @Transactional(readOnly = true)
    public Page<UserResponse> getUsers(UUID adminId, String query, Pageable pageable) {
        validateAdmin(adminId);
        if (pageable.getPageSize() > 100) throw new ValidationError("Kích thước trang tối đa là 100.");
        if (query == null || query.isBlank()) return users.findAll(pageable).map(UserResponse::from);
        return users.findByEmailContainingIgnoreCase(query.strip(), pageable).map(UserResponse::from);
    }
    /** Updates manual status, immediately revoking credentials on both lock and unlock. */
    @Transactional
    public UserResponse updateUserStatus(UUID adminId, UUID targetId, UserStatus status, long expectedVersion) {
        lockAdministration(); validateAdmin(adminId);
        if (adminId.equals(targetId) && status == UserStatus.LOCKED)
            throw new AuthorizationError("Không thể tự khóa tài khoản quản trị.");
        User target = target(targetId, expectedVersion);
        protectLastAdmin(target, target.getSystemRole(), status);
        if (target.getStatus() != status) {
            target.setStatus(status); invalidate(target);
        }
        audit.record(adminId, "ADMIN_USER_STATUS", "USER", targetId, "SUCCESS");
        users.flush();
        return UserResponse.from(target);
    }
    /** Changes roles with optimistic version validation and no self-demotion. */
    @Transactional
    public UserResponse updateUserRole(UUID adminId, UUID targetId, SystemRole role, long expectedVersion) {
        lockAdministration(); validateAdmin(adminId);
        if (adminId.equals(targetId) && role != SystemRole.ADMIN)
            throw new AuthorizationError("Không thể tự hạ quyền quản trị.");
        User target = target(targetId, expectedVersion);
        protectLastAdmin(target, role, target.getStatus());
        if (target.getSystemRole() != role) {
            target.setSystemRole(role); invalidate(target);
        }
        audit.record(adminId, "ADMIN_USER_ROLE", "USER", targetId, "SUCCESS");
        users.flush();
        return UserResponse.from(target);
    }
    private void lockAdministration() {
        entityManager.createNativeQuery("SELECT 1 FROM pg_advisory_xact_lock(:lockId)", Integer.class)
                .setParameter("lockId", ADMIN_MUTATION_LOCK).getSingleResult();
    }
    private User target(UUID targetId, long expectedVersion) {
        User target = users.lockById(targetId).orElseThrow(() -> new NotFoundError("Người dùng không tồn tại."));
        if (target.getVersion() != expectedVersion) throw new ConflictError("Thông tin tài khoản đã thay đổi. Vui lòng tải lại.");
        return target;
    }
    private void protectLastAdmin(User target, SystemRole role, UserStatus status) {
        boolean removing = target.getSystemRole() == SystemRole.ADMIN && target.getStatus() == UserStatus.ACTIVE
                && (role != SystemRole.ADMIN || status != UserStatus.ACTIVE);
        if (removing && users.countBySystemRoleAndStatus(SystemRole.ADMIN, UserStatus.ACTIVE) <= 1)
            throw new ConflictError("Hệ thống cần ít nhất một quản trị viên đang hoạt động.");
    }
    private void invalidate(User target) {
        target.invalidateCredentials(); target.setFailedLoginCount(0); target.setLockedUntil(null);
        target.setUpdatedAt(Instant.now(clock)); users.save(target);
        tokens.revokeAllTokensByUser(target.getId());
    }
    private void validateAdmin(UUID adminId) {
        User admin = users.findById(adminId).orElseThrow(() -> new AuthorizationError("Quyền truy cập bị từ chối."));
        if (admin.getStatus() != UserStatus.ACTIVE || admin.getSystemRole() != SystemRole.ADMIN)
            throw new AuthorizationError("Quyền truy cập bị từ chối. Chỉ dành cho Quản trị viên.");
    }
}