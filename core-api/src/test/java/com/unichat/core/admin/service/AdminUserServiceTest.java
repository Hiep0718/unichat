package com.unichat.core.admin.service;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.time.Clock;
import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;

import com.unichat.core.common.error.AuthorizationError;
import com.unichat.core.user.domain.SystemRole;
import com.unichat.core.user.domain.User;
import com.unichat.core.user.domain.UserRepository;
import com.unichat.core.user.domain.UserStatus;

class AdminUserServiceTest {

    private UserRepository userRepository;
    private AdminUserService adminUserService;

    @BeforeEach
    void setUp() {
        userRepository = mock(UserRepository.class);
        adminUserService = new AdminUserService(userRepository, Clock.systemUTC());
    }

    @Test
    void shouldGetUsersListWhenAdmin() {
        var adminId = UUID.randomUUID();
        var admin = new User(adminId, "admin@unichat.edu.vn", "hash", SystemRole.ADMIN, UserStatus.ACTIVE, Instant.now());
        var targetUser = new User(UUID.randomUUID(), "student@unichat.edu.vn", "hash", SystemRole.USER, UserStatus.ACTIVE, Instant.now());
        var pageable = PageRequest.of(0, 20);

        when(userRepository.findById(adminId)).thenReturn(Optional.of(admin));
        when(userRepository.searchUsers("student", pageable)).thenReturn(new PageImpl<>(List.of(targetUser)));

        var page = adminUserService.getUsers(adminId, "student", pageable);

        assertNotNull(page);
        assertEquals(1, page.getTotalElements());
        assertEquals("student@unichat.edu.vn", page.getContent().get(0).email());
    }

    @Test
    void shouldThrowAuthorizationErrorWhenUserIsNotAdmin() {
        var userId = UUID.randomUUID();
        var normalUser = new User(userId, "student@unichat.edu.vn", "hash", SystemRole.USER, UserStatus.ACTIVE, Instant.now());
        var pageable = PageRequest.of(0, 20);

        when(userRepository.findById(userId)).thenReturn(Optional.of(normalUser));

        assertThrows(AuthorizationError.class, () -> adminUserService.getUsers(userId, null, pageable));
    }

    @Test
    void shouldUpdateUserStatusSuccessfullyWhenAdmin() {
        var adminId = UUID.randomUUID();
        var targetId = UUID.randomUUID();
        var admin = new User(adminId, "admin@unichat.edu.vn", "hash", SystemRole.ADMIN, UserStatus.ACTIVE, Instant.now());
        var targetUser = new User(targetId, "student@unichat.edu.vn", "hash", SystemRole.USER, UserStatus.ACTIVE, Instant.now());

        when(userRepository.findById(adminId)).thenReturn(Optional.of(admin));
        when(userRepository.findById(targetId)).thenReturn(Optional.of(targetUser));

        var updated = adminUserService.updateUserStatus(adminId, targetId, UserStatus.LOCKED);

        assertNotNull(updated);
        assertEquals(UserStatus.LOCKED, updated.status());
        verify(userRepository).save(targetUser);
    }
}
