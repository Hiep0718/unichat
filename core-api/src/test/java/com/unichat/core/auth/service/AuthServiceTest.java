package com.unichat.core.auth.service;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;
import java.time.Clock;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.security.crypto.password.PasswordEncoder;
import com.unichat.core.admin.service.AuditService;
import com.unichat.core.auth.api.LoginRequest;
import com.unichat.core.auth.api.RegisterRequest;
import com.unichat.core.common.error.UnauthenticatedError;
import com.unichat.core.common.error.ValidationError;
import com.unichat.core.user.domain.SystemRole;
import com.unichat.core.user.domain.User;
import com.unichat.core.user.domain.UserRepository;
import com.unichat.core.user.domain.UserStatus;

class AuthServiceTest {
    private final UserRepository users = mock(UserRepository.class);
    private final PasswordEncoder passwords = mock(PasswordEncoder.class);
    private final TokenService tokens = mock(TokenService.class);
    private final LoginTransactions login = mock(LoginTransactions.class);
    private final PasswordResetService resets = mock(PasswordResetService.class);
    private final AuditService audit = mock(AuditService.class);
    private final AuthService service = new AuthService(users, passwords, tokens, login, resets, audit, Clock.systemUTC());

    @Test
    void shouldRegisterNormalizedEmailWithoutChangingPassword() {
        var request = new RegisterRequest(" STUDENT@unichat.vn ", "  mật khẩu mới  ");
        when(passwords.encode(request.password())).thenReturn("encoded");
        var response = service.register(request);
        assertEquals("student@unichat.vn", response.email());
        assertEquals(SystemRole.USER, response.systemRole());
        assertEquals(UserStatus.ACTIVE, response.status());
        verify(passwords).encode("  mật khẩu mới  ");
        verify(users).saveAndFlush(any(User.class));
        verify(audit).record(eq(response.id()), eq("AUTH_REGISTER"), eq("USER"), eq(response.id()), eq("SUCCESS"));
    }
    @Test
    void shouldRejectDuplicateWithoutIssuingCredentials() {
        when(users.existsByEmailIgnoreCase("student@unichat.vn")).thenReturn(true);
        assertThrows(ValidationError.class, () -> service.register(new RegisterRequest("student@unichat.vn", "password123456")));
        verifyNoInteractions(tokens);
    }
    @Test
    void shouldReturnCommittedLoginDecision() {
        var request = new LoginRequest("student@unichat.vn", "legacy");
        var pair = new AuthService.TokenPair("access", "refresh");
        when(login.authenticate(request)).thenReturn(new LoginTransactions.Decision(pair));
        assertSame(pair, service.login(request));
    }
    @Test
    void shouldThrowOnlyAfterLoginTransactionReturnsDenial() {
        var request = new LoginRequest("student@unichat.vn", "wrong");
        when(login.authenticate(request)).thenReturn(new LoginTransactions.Decision(null));
        assertThrows(UnauthenticatedError.class, () -> service.login(request));
        verify(login).authenticate(request);
    }
    @Test
    void shouldFailRegistrationWhenAuditCannotPersist() {
        doThrow(new IllegalStateException("audit unavailable")).when(audit).record(any(), any(), any(), any(), any());
        assertThrows(IllegalStateException.class, () -> service.register(new RegisterRequest("student@unichat.vn", "password123456")));
    }
}