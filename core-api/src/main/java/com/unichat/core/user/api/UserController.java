package com.unichat.core.user.api;

import java.util.UUID;

import jakarta.validation.Valid;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.unichat.core.user.api.ChangePasswordRequest;
import com.unichat.core.user.service.UserService;

/**
 * Controller exposing self-profile and admin-level user actions.
 */
@RestController
@RequestMapping("/api/v1")
public class UserController {

    private final UserService userService;

    public UserController(UserService userService) {
        this.userService = userService;
    }

    /**
     * Gets the profile of the authenticated requester.
     */
    @GetMapping("/users/me")
    public ResponseEntity<UserResponse> getMe(@AuthenticationPrincipal Jwt jwt) {
        UUID userId = UUID.fromString(jwt.getSubject());
        return ResponseEntity.ok(userService.getUserById(userId));
    }

    /**
     * Searches and paginates users (Admin only).
     */
    @GetMapping("/admin/users")
    public ResponseEntity<Page<UserResponse>> getUsers(
            @RequestParam(value = "query", required = false) String query,
            @RequestParam(value = "page", defaultValue = "0") int page,
            @RequestParam(value = "size", defaultValue = "20") int size) {
        
        int pageSize = Math.min(size, 100); // Enforce max page size of 100
        Pageable pageable = PageRequest.of(page, pageSize);
        return ResponseEntity.ok(userService.searchUsers(query, pageable));
    }

    /**
     * Updates account status (Admin only).
     */
    @PatchMapping("/admin/users/{userId}/status")
    public ResponseEntity<UserResponse> updateStatus(
            @PathVariable("userId") UUID userId,
            @Valid @RequestBody UpdateUserStatusRequest request) {
        return ResponseEntity.ok(userService.updateStatus(userId, request.status()));
    }

    /**
     * Changes the password of the authenticated user.
     */
    @PatchMapping("/users/me/password")
    public ResponseEntity<Void> changePassword(
            @AuthenticationPrincipal org.springframework.security.oauth2.jwt.Jwt jwt,
            @Valid @RequestBody ChangePasswordRequest request) {
        UUID userId = UUID.fromString(jwt.getSubject());
        userService.changePassword(userId, request);
        return ResponseEntity.noContent().build();
    }
}
