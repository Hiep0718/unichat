package com.unichat.core.admin.service;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;
import java.time.Clock;
import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import jakarta.persistence.EntityManager;
import jakarta.persistence.Query;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import com.unichat.core.auth.service.TokenService;
import com.unichat.core.common.error.AuthorizationError;
import com.unichat.core.common.error.ConflictError;
import com.unichat.core.user.domain.*;

class AdminUserServiceTest {
    private final UserRepository users = mock(UserRepository.class);
    private final TokenService tokens = mock(TokenService.class);
    private final AuditService audit = mock(AuditService.class);
    private final EntityManager persistence = mock(EntityManager.class);
    private final AdminUserService service = new AdminUserService(users, Clock.systemUTC(), tokens, audit, persistence);
    private final User admin = account(SystemRole.ADMIN);
    private final User target = account(SystemRole.USER);

    @BeforeEach
    void prepareAccountsAndGlobalLock() {
        when(users.findById(admin.getId())).thenReturn(Optional.of(admin));
        when(users.lockById(target.getId())).thenReturn(Optional.of(target));
        Query lock = mock(Query.class); when(persistence.createNativeQuery(anyString(), eq(Integer.class))).thenReturn(lock);
        when(lock.setParameter(eq("lockId"), any())).thenReturn(lock); when(lock.getSingleResult()).thenReturn(1);
    }
    @Test
    void shouldSearchByEmailForActiveAdministrator() {
        var page = PageRequest.of(0, 20);
        when(users.findByEmailContainingIgnoreCase("student", page)).thenReturn(new PageImpl<>(List.of(target)));
        assertEquals(1, service.getUsers(admin.getId(), "student", page).getTotalElements());
    }
    @Test
    void shouldDenyNameOrEmailSpoofWithoutAdminRole() {
        admin.setSystemRole(SystemRole.USER); admin.rename("admin");
        assertThrows(AuthorizationError.class, () -> service.getUsers(admin.getId(), null, PageRequest.of(0, 20)));
    }
    @Test
    void shouldRevokeAllSessionsAndAuditManualLock() {
        var response = service.updateUserStatus(admin.getId(), target.getId(), UserStatus.LOCKED, 0);
        assertEquals(UserStatus.LOCKED, response.status()); assertEquals(1, target.getSecurityVersion());
        verify(tokens).revokeAllTokensByUser(target.getId());
        verify(audit).record(admin.getId(), "ADMIN_USER_STATUS", "USER", target.getId(), "SUCCESS");
    }
    @Test
    void shouldInvalidateAgainWhenManuallyUnlocked() {
        target.setStatus(UserStatus.LOCKED); target.invalidateCredentials();
        service.updateUserStatus(admin.getId(), target.getId(), UserStatus.ACTIVE, 0);
        assertEquals(2, target.getSecurityVersion()); verify(tokens).revokeAllTokensByUser(target.getId());
    }
    @Test
    void shouldRejectStaleExpectedVersionBeforeMutation() {
        assertThrows(ConflictError.class, () -> service.updateUserRole(admin.getId(), target.getId(), SystemRole.ADMIN, 99));
        verifyNoInteractions(tokens, audit);
    }
    @Test
    void shouldRejectSelfDemotionAndSelfLock() {
        assertThrows(AuthorizationError.class, () -> service.updateUserRole(admin.getId(), admin.getId(), SystemRole.USER, 0));
        assertThrows(AuthorizationError.class, () -> service.updateUserStatus(admin.getId(), admin.getId(), UserStatus.LOCKED, 0));
    }
    @Test
    void shouldPreserveLastActiveAdminIgnoringTemporaryLoginLock() {
        target.setSystemRole(SystemRole.ADMIN); target.setLockedUntil(Instant.now().plusSeconds(900));
        when(users.countBySystemRoleAndStatus(SystemRole.ADMIN, UserStatus.ACTIVE)).thenReturn(1L);
        assertThrows(ConflictError.class, () -> service.updateUserRole(admin.getId(), target.getId(), SystemRole.USER, 0));
        verifyNoInteractions(tokens, audit);
    }
    @Test
    void shouldPropagateAuditFailureInsteadOfReportingMutationSuccess() {
        doThrow(new IllegalStateException("audit unavailable")).when(audit).record(any(), any(), any(), any(), any());
        assertThrows(IllegalStateException.class, () -> service.updateUserRole(admin.getId(), target.getId(), SystemRole.ADMIN, 0));
    }
    private User account(SystemRole role) {
        return new User(UUID.randomUUID(), "admin@unichat.edu.vn", "hash", role, UserStatus.ACTIVE, Instant.now());
    }
}