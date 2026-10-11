package com.unichat.core.auth.service;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;
import java.time.Clock;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.security.crypto.password.PasswordEncoder;
import com.unichat.core.admin.service.AuditService;
import com.unichat.core.auth.api.LoginRequest;
import com.unichat.core.user.domain.SystemRole;
import com.unichat.core.user.domain.User;
import com.unichat.core.user.domain.UserRepository;
import com.unichat.core.user.domain.UserStatus;

class LoginTransactionsTest {
    private final Instant now = Instant.parse("2026-10-11T00:00:00Z");
    private final UserRepository users = mock(UserRepository.class);
    private final PasswordEncoder passwords = mock(PasswordEncoder.class);
    private final TokenService tokens = mock(TokenService.class);
    private final AuditService audit = mock(AuditService.class);
    private final User user = new User(UUID.randomUUID(), "student@unichat.vn", "hash", SystemRole.USER, UserStatus.ACTIVE, now);
    private final LoginRequest request = new LoginRequest(user.getEmail(), " legacy password ");
    private final LoginTransactions service = new LoginTransactions(users, passwords, tokens, audit, Clock.fixed(now, ZoneOffset.UTC));

    @BeforeEach
    void prepareAccount() { when(users.lockByEmail(user.getEmail())).thenReturn(Optional.of(user)); }
    @Test
    void shouldPersistFifthFailureAsTemporaryLockWithoutChangingStatus() {
        user.setFailedLoginCount(4);
        assertNull(service.authenticate(request).tokens());
        assertEquals(5, user.getFailedLoginCount()); assertEquals(now.plusSeconds(900), user.getLockedUntil());
        assertEquals(UserStatus.ACTIVE, user.getStatus()); verify(users).save(user);
        verify(audit).record(user.getId(), "AUTH_LOGIN_FAILURE", "USER", user.getId(), "DENIED");
    }
    @Test
    void shouldNotVerifyPasswordWhileTemporarilyLocked() {
        user.setLockedUntil(now.plusSeconds(1));
        assertNull(service.authenticate(request).tokens()); verifyNoInteractions(passwords, tokens);
    }
    @Test
    void shouldNeverUnlockManualLockEvenAfterOldTimeout() {
        user.setStatus(UserStatus.LOCKED); user.setLockedUntil(now.minusSeconds(1));
        assertNull(service.authenticate(request).tokens());
        assertEquals(UserStatus.LOCKED, user.getStatus()); verifyNoInteractions(tokens);
    }
    @Test
    void shouldResetExpiredTemporaryCounterAndPreserveExactPassword() {
        user.setFailedLoginCount(5); user.setLockedUntil(now);
        when(passwords.matches(request.password(), user.getPasswordHash())).thenReturn(true);
        when(tokens.createRefreshToken(eq(user.getId()), any())).thenReturn("refresh");
        when(tokens.generateAccessToken(eq(user), any())).thenReturn("access");
        assertEquals("access", service.authenticate(request).tokens().accessToken());
        assertEquals(0, user.getFailedLoginCount()); assertNull(user.getLockedUntil());
        verify(passwords).matches(" legacy password ", "hash");
    }
    @Test
    void shouldAuditUnknownAccountWithoutCredentials() {
        when(users.lockByEmail(user.getEmail())).thenReturn(Optional.empty());
        assertNull(service.authenticate(request).tokens());
        verify(audit).record(null, "AUTH_LOGIN_FAILURE", "USER", null, "DENIED"); verifyNoInteractions(tokens);
    }
    @Test
    void shouldPropagateAuditFailureInsteadOfReportingSuccess() {
        doThrow(new IllegalStateException("audit unavailable")).when(audit).record(any(), any(), any(), any(), any());
        assertThrows(IllegalStateException.class, () -> service.authenticate(request));
    }
}
