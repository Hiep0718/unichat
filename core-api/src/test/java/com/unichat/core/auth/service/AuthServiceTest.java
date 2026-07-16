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

import com.unichat.core.auth.api.LoginRequest;
import com.unichat.core.auth.api.RegisterRequest;
import com.unichat.core.common.error.ConflictError;
import com.unichat.core.common.error.UnauthenticatedError;
import com.unichat.core.user.domain.SystemRole;
import com.unichat.core.user.domain.User;
import com.unichat.core.user.domain.UserRepository;
import com.unichat.core.user.domain.UserStatus;

class AuthServiceTest {

    private UserRepository userRepository;
    private PasswordEncoder passwordEncoder;
    private TokenService tokenService;
    private Clock clock;
    private AuthService authService;

    @BeforeEach
    void setUp() {
        userRepository = mock(UserRepository.class);
        passwordEncoder = mock(PasswordEncoder.class);
        tokenService = mock(TokenService.class);
        clock = Clock.fixed(Instant.parse("2026-07-16T00:00:00Z"), ZoneOffset.UTC);
        authService = new AuthService(userRepository, passwordEncoder, tokenService, clock);
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
    void shouldThrowConflictErrorWhenRegisteringDuplicateEmail() {
        // Arrange
        var request = new RegisterRequest("test@unichat.com", "password12345");
        when(userRepository.existsByEmailIgnoreCase(request.email())).thenReturn(true);

        // Act & Assert
        assertThrows(ConflictError.class, () -> authService.register(request));
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
}
