package com.unichat.core.user.service;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.time.Clock;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.Optional;
import java.util.UUID;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import com.unichat.core.common.error.NotFoundError;
import com.unichat.core.user.domain.SystemRole;
import com.unichat.core.user.domain.User;
import com.unichat.core.user.domain.UserRepository;
import com.unichat.core.user.domain.UserStatus;
import com.unichat.core.auth.service.TokenService;

class UserServiceTest {

    private UserRepository userRepository;
    private Clock clock;
    private org.springframework.security.crypto.password.PasswordEncoder passwordEncoder;
    private TokenService tokenService;
    private UserService userService;

    @BeforeEach
    void setUp() {
        userRepository = mock(UserRepository.class);
        clock = Clock.fixed(Instant.parse("2026-07-16T00:00:00Z"), ZoneOffset.UTC);
        passwordEncoder = mock(org.springframework.security.crypto.password.PasswordEncoder.class);
        tokenService = mock(TokenService.class);
        userService = new UserService(userRepository, clock, passwordEncoder, tokenService);
    }

    @Test
    void shouldGetUserByIdWhenUserExists() {
        // Arrange
        var userId = UUID.randomUUID();
        var user = new User(userId, "test@unichat.com", "hash", SystemRole.USER, UserStatus.ACTIVE, Instant.now(clock));
        when(userRepository.findById(userId)).thenReturn(Optional.of(user));

        // Act
        var response = userService.getUserById(userId);

        // Assert
        assertNotNull(response);
        assertEquals(userId, response.id());
        assertEquals("test@unichat.com", response.email());
    }

    @Test
    void shouldThrowNotFoundErrorWhenUserDoesNotExist() {
        // Arrange
        var userId = UUID.randomUUID();
        when(userRepository.findById(userId)).thenReturn(Optional.empty());

        // Act & Assert
        assertThrows(NotFoundError.class, () -> userService.getUserById(userId));
    }

    @Test
    void shouldUpdateUserStatusAndResetFailedAttemptsWhenActivating() {
        // Arrange
        var userId = UUID.randomUUID();
        var user = new User(userId, "test@unichat.com", "hash", SystemRole.USER, UserStatus.LOCKED, Instant.now(clock));
        user.setFailedLoginCount(5);
        user.setLockedUntil(Instant.now(clock).plusSeconds(900));

        when(userRepository.findById(userId)).thenReturn(Optional.of(user));

        // Act
        var response = userService.updateStatus(userId, UserStatus.ACTIVE);

        // Assert
        assertNotNull(response);
        assertEquals(UserStatus.ACTIVE, response.status());
        assertEquals(0, user.getFailedLoginCount());
        assertNull(user.getLockedUntil());
        verify(userRepository).save(user);
    }

    @Test
    void shouldRevokeTokensWhenUserStatusIsLocked() {
        // Arrange
        var userId = UUID.randomUUID();
        var user = new User(userId, "test@unichat.com", "hash", SystemRole.USER, UserStatus.ACTIVE, Instant.now(clock));

        when(userRepository.findById(userId)).thenReturn(Optional.of(user));

        // Act
        var response = userService.updateStatus(userId, UserStatus.LOCKED);

        // Assert
        assertEquals(UserStatus.LOCKED, response.status());
        assertNotNull(user.getLockedUntil());
        verify(tokenService).revokeAllTokensByUser(userId);
        verify(userRepository).save(user);
    }

    @Test
    void shouldChangePasswordWhenCurrentPasswordMatches() {
        // Arrange
        var userId = UUID.randomUUID();
        var user = new User(userId, "test@unichat.com", "old_hash", SystemRole.USER, UserStatus.ACTIVE, Instant.now(clock));
        var request = new com.unichat.core.user.api.ChangePasswordRequest("current_password", "new_password_123");

        when(userRepository.findById(userId)).thenReturn(Optional.of(user));
        when(passwordEncoder.matches("current_password", "old_hash")).thenReturn(true);
        when(passwordEncoder.encode("new_password_123")).thenReturn("new_hash");

        // Act
        userService.changePassword(userId, request);

        // Assert
        assertEquals("new_hash", user.getPasswordHash());
        verify(userRepository).save(user);
    }

    @Test
    void shouldThrowValidationErrorWhenCurrentPasswordIsWrong() {
        // Arrange
        var userId = UUID.randomUUID();
        var user = new User(userId, "test@unichat.com", "old_hash", SystemRole.USER, UserStatus.ACTIVE, Instant.now(clock));
        var request = new com.unichat.core.user.api.ChangePasswordRequest("wrong_password", "new_password_123");

        when(userRepository.findById(userId)).thenReturn(Optional.of(user));
        when(passwordEncoder.matches("wrong_password", "old_hash")).thenReturn(false);

        // Act & Assert
        assertThrows(com.unichat.core.common.error.ValidationError.class, 
                () -> userService.changePassword(userId, request));
    }
}
