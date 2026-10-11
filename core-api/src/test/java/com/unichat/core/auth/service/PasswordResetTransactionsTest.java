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
import org.mockito.ArgumentCaptor;
import org.springframework.security.crypto.password.PasswordEncoder;
import com.unichat.core.admin.service.AuditService;
import com.unichat.core.auth.api.ResetPasswordRequest;
import com.unichat.core.auth.domain.*;
import com.unichat.core.user.domain.*;

class PasswordResetTransactionsTest {
    private final Instant now = Instant.parse("2026-10-11T00:00:00Z");
    private final UserRepository users = mock(UserRepository.class);
    private final PasswordResetOtpRepository challenges = mock(PasswordResetOtpRepository.class);
    private final OtpHasher hasher = new OtpHasher("test-only-otp-secret-at-least-32-characters");
    private final PasswordEncoder passwords = mock(PasswordEncoder.class);
    private final TokenService tokens = mock(TokenService.class);
    private final AuditService audit = mock(AuditService.class);
    private final User user = new User(UUID.randomUUID(), "student@unichat.vn", "hash", SystemRole.USER, UserStatus.ACTIVE, now);
    private final UUID challengeId = UUID.randomUUID();
    private final PasswordResetOtp challenge = new PasswordResetOtp(user.getEmail(), challengeId,
            hasher.digest(challengeId, user.getEmail(), "012345"), now.plusSeconds(300), now.minusSeconds(60));
    private final PasswordResetTransactions service = new PasswordResetTransactions(users, challenges, hasher, passwords, tokens, audit,
            Clock.fixed(now, ZoneOffset.UTC));

    @BeforeEach
    void prepareAccount() {
        when(users.lockByEmail(user.getEmail())).thenReturn(Optional.of(user));
        when(challenges.findByEmailIgnoreCase(user.getEmail())).thenReturn(Optional.of(challenge));
    }
    @Test
    void shouldPersistOnlyHmacAndInvalidateOldCodeOnResend() {
        var delivery = service.prepare("STUDENT@unichat.vn");
        var captured = ArgumentCaptor.forClass(PasswordResetOtp.class); verify(challenges).save(captured.capture());
        var replacement = captured.getValue();
        assertTrue(delivery.code().matches("[0-9]{6}")); assertNotEquals(challengeId, replacement.getChallengeId());
        assertTrue(hasher.matches(replacement.getOtpHash(), replacement.getChallengeId(), user.getEmail(), delivery.code()));
        assertEquals(now.plusSeconds(300), replacement.getExpiresAt());
    }
    @Test
    void shouldKeepResendCooldownAndUnknownEmailUniform() {
        var recent = new PasswordResetOtp(user.getEmail(), challengeId, "hash", now.plusSeconds(300), now.minusSeconds(59));
        when(challenges.findByEmailIgnoreCase(user.getEmail())).thenReturn(Optional.of(recent));
        assertNull(service.prepare(user.getEmail())); assertNull(service.prepare("unknown@unichat.vn"));
        verify(challenges, never()).save(any());
    }
    @Test
    void shouldCountWrongAttemptsAndRejectSixth() {
        var wrong = new ResetPasswordRequest(user.getEmail(), "654321", "new-password-123");
        for (int index = 0; index < 6; index++) assertFalse(service.reset(wrong));
        assertEquals(5, challenge.getAttempts()); verifyNoInteractions(passwords, tokens);
    }
    @Test
    void shouldConsumeOnceAndRevokeSessionsWithoutUnlockingManualLock() {
        user.setStatus(UserStatus.LOCKED);
        var request = new ResetPasswordRequest(user.getEmail(), "012345", " mật khẩu mới ");
        when(passwords.encode(request.newPassword())).thenReturn("new-hash");
        assertTrue(service.reset(request)); assertFalse(service.reset(request));
        assertEquals(now, challenge.getConsumedAt()); assertEquals(1, user.getSecurityVersion());
        assertEquals(UserStatus.LOCKED, user.getStatus()); assertEquals("new-hash", user.getPasswordHash());
        verify(tokens).revokeAllTokensByUser(user.getId()); verify(passwords).encode(" mật khẩu mới ");
    }
    @Test
    void shouldDenyChallengeAtExactExpiry() {
        when(challenges.findByEmailIgnoreCase(user.getEmail())).thenReturn(Optional.of(
                new PasswordResetOtp(user.getEmail(), challengeId, "hash", now, now.minusSeconds(300))));
        assertFalse(service.reset(new ResetPasswordRequest(user.getEmail(), "012345", "new-password-123")));
        verifyNoInteractions(tokens);
    }
    @Test
    void shouldPropagateAuditFailureSoResetCannotReportSuccess() {
        doThrow(new IllegalStateException("audit unavailable")).when(audit).record(any(), any(), any(), any(), any());
        assertThrows(IllegalStateException.class, () -> service.reset(new ResetPasswordRequest(user.getEmail(), "012345", "new-password-123")));
    }
}
