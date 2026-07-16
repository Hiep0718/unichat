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

class UserServiceTest {

    private UserRepository userRepository;
    private Clock clock;
    private UserService userService;

    @BeforeEach
    void setUp() {
        userRepository = mock(UserRepository.class);
        clock = Clock.fixed(Instant.parse("2026-07-16T00:00:00Z"), ZoneOffset.UTC);
        userService = new UserService(userRepository, clock);
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
}
