package com.unichat.core.auth.service;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.time.Clock;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.Optional;
import java.util.UUID;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.security.crypto.password.PasswordEncoder;

import com.unichat.core.auth.api.ForgotPasswordRequest;
import com.unichat.core.auth.api.LoginRequest;
import com.unichat.core.auth.api.RegisterRequest;
import com.unichat.core.auth.api.ResetPasswordRequest;
import com.unichat.core.auth.domain.PasswordResetOtp;
import com.unichat.core.auth.domain.PasswordResetOtpRepository;
import com.unichat.core.common.error.ConflictError;
import com.unichat.core.common.error.NotFoundError;
import com.unichat.core.common.error.UnauthenticatedError;
import com.unichat.core.common.error.ValidationError;
import com.unichat.core.user.domain.SystemRole;
import com.unichat.core.user.domain.User;
import com.unichat.core.user.domain.UserRepository;
import com.unichat.core.user.domain.UserStatus;

import org.springframework.mail.javamail.JavaMailSender;

class AuthServiceTest {

    private UserRepository userRepository;
    private PasswordEncoder passwordEncoder;
    private TokenService tokenService;
    private PasswordResetOtpRepository passwordResetOtpRepository;
    private JavaMailSender mailSender;
    private Clock clock;
    private AuthService authService;

    @BeforeEach
    void setUp() {
        userRepository = mock(UserRepository.class);
        passwordEncoder = mock(PasswordEncoder.class);
        tokenService = mock(TokenService.class);
        passwordResetOtpRepository = mock(PasswordResetOtpRepository.class);
        mailSender = mock(JavaMailSender.class);
        clock = Clock.fixed(Instant.parse("2026-07-16T00:00:00Z"), ZoneOffset.UTC);
        authService = new AuthService(userRepository, passwordEncoder, tokenService, passwordResetOtpRepository, mailSender, clock);
    }

    @Test
    void shouldRegisterUserWhenEmailIsUnique() {
        // Arrange
        var request = new RegisterRequest("test@unichat.com", "password12345");
        when(userRepository.existsByEmailIgnoreCase(request.email())).thenReturn(false);
        when(passwordEncoder.encode(request.password())).thenReturn("hashed_password");

        // Act
        var response = authService.register(request);

        // Assert
        assertNotNull(response);
        assertEquals(request.email(), response.email());
        assertEquals(SystemRole.USER, response.systemRole());
        assertEquals(UserStatus.ACTIVE, response.status());
        verify(userRepository).save(any(User.class));
    }

    @Test
    void shouldThrowValidationErrorWhenRegisteringDuplicateEmail() {
        // Arrange
        var request = new RegisterRequest("test@unichat.com", "password12345");
        when(userRepository.existsByEmailIgnoreCase(request.email())).thenReturn(true);

        // Act & Assert
        assertThrows(ValidationError.class, () -> authService.register(request));
        verify(userRepository, never()).save(any(User.class));
    }

    @Test
    void shouldAuthenticateUserWhenCredentialsAreCorrect() {
        // Arrange
        var request = new LoginRequest("test@unichat.com", "password12345");
        var user = new User(UUID.randomUUID(), "test@unichat.com", "hashed_password", SystemRole.USER, UserStatus.ACTIVE, Instant.now(clock));
        when(userRepository.findByEmailIgnoreCase(request.email())).thenReturn(Optional.of(user));
        when(passwordEncoder.matches(request.password(), user.getPasswordHash())).thenReturn(true);
        when(tokenService.generateAccessToken(user)).thenReturn("access_token");
        when(tokenService.createRefreshToken(eq(user.getId()), any(UUID.class))).thenReturn("refresh_token");

        // Act
        var tokenPair = authService.login(request);

        // Assert
        assertNotNull(tokenPair);
        assertEquals("access_token", tokenPair.accessToken());
        assertEquals("refresh_token", tokenPair.refreshToken());
        assertEquals(0, user.getFailedLoginCount());
    }

    @Test
    void shouldLockAccountWhenPasswordFailsFiveTimes() {
        // Arrange
        var request = new LoginRequest("test@unichat.com", "wrong_password");
        var user = new User(UUID.randomUUID(), "test@unichat.com", "hashed_password", SystemRole.USER, UserStatus.ACTIVE, Instant.now(clock));
        user.setFailedLoginCount(4);
        when(userRepository.findByEmailIgnoreCase(request.email())).thenReturn(Optional.of(user));
        when(passwordEncoder.matches(request.password(), user.getPasswordHash())).thenReturn(false);

        // Act & Assert
        assertThrows(UnauthenticatedError.class, () -> authService.login(request));
        assertEquals(5, user.getFailedLoginCount());
        assertEquals(UserStatus.LOCKED, user.getStatus());
        assertNotNull(user.getLockedUntil());
        verify(userRepository).save(user);
    }

    @Test
    void shouldRequestPasswordResetWhenUserExists() {
        // Arrange
        var request = new ForgotPasswordRequest("test@unichat.com");
        when(userRepository.existsByEmailIgnoreCase(request.email())).thenReturn(true);

        // Act
        authService.requestPasswordReset(request);

        // Assert
        verify(passwordResetOtpRepository).save(any(PasswordResetOtp.class));
    }

    @Test
    void shouldSilentlyReturnOnResetRequestWhenUserDoesNotExist() {
        // Arrange
        var request = new ForgotPasswordRequest("nonexistent@unichat.com");
        when(userRepository.existsByEmailIgnoreCase(request.email())).thenReturn(false);

        // Act
        authService.requestPasswordReset(request);

        // Assert
        verify(passwordResetOtpRepository, never()).save(any(PasswordResetOtp.class));
    }

    @Test
    void shouldResetPasswordWhenOtpIsValid() {
        // Arrange
        var request = new ResetPasswordRequest("test@unichat.com", "123456", "newPassword12345");
        var otp = new PasswordResetOtp("test@unichat.com", "123456", Instant.now(clock).plusSeconds(300), Instant.now(clock));
        var user = new User(UUID.randomUUID(), "test@unichat.com", "old_hash", SystemRole.USER, UserStatus.ACTIVE, Instant.now(clock));

        when(passwordResetOtpRepository.findByEmailIgnoreCase(request.email())).thenReturn(Optional.of(otp));
        when(userRepository.findByEmailIgnoreCase(request.email())).thenReturn(Optional.of(user));
        when(passwordEncoder.encode(request.newPassword())).thenReturn("new_hash");

        // Act
        authService.resetPassword(request);

        // Assert
        assertEquals("new_hash", user.getPasswordHash());
        verify(userRepository).save(user);
        verify(passwordResetOtpRepository).delete(otp);
    }

    @Test
    void shouldThrowValidationErrorWhenOtpIsInvalid() {
        // Arrange
        var request = new ResetPasswordRequest("test@unichat.com", "654321", "newPassword12345");
        var otp = new PasswordResetOtp("test@unichat.com", "123456", Instant.now(clock).plusSeconds(300), Instant.now(clock));

        when(passwordResetOtpRepository.findByEmailIgnoreCase(request.email())).thenReturn(Optional.of(otp));

        // Act & Assert
        assertThrows(ValidationError.class, () -> authService.resetPassword(request));
        verify(userRepository, never()).save(any(User.class));
        verify(passwordResetOtpRepository, never()).delete(any(PasswordResetOtp.class));
    }
}
