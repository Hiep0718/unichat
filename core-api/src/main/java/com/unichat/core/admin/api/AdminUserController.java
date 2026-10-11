package com.unichat.core.admin.api;

import java.util.UUID;

import jakarta.validation.Valid;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Size;
import org.springframework.security.access.prepost.PreAuthorize;

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

import com.unichat.core.admin.service.AdminUserService;
import com.unichat.core.user.api.UpdateUserRoleRequest;
import com.unichat.core.user.api.UpdateUserStatusRequest;
import com.unichat.core.user.api.UserResponse;

/**
 * REST controller for system administrators to inspect and manage user accounts.
 */
@RestController
@RequestMapping("/api/v1/admin/users")
@PreAuthorize("hasAuthority('SCOPE_ADMIN')")
public class AdminUserController {

    private final AdminUserService adminUserService;

    public AdminUserController(AdminUserService adminUserService) {
        this.adminUserService = adminUserService;
    }

    /**
     * Lists users with search query and pagination.
     */
    @GetMapping
    public ResponseEntity<Page<UserResponse>> getUsers(
            @AuthenticationPrincipal Jwt jwt,
            @RequestParam(value = "query", required = false) @Size(max = 254) String query,
            @RequestParam(value = "page", defaultValue = "0") @Min(0) int page,
            @RequestParam(value = "size", defaultValue = "20") @Min(1) @Max(100) int size) {
        UUID adminUserId = UUID.fromString(jwt.getSubject());
        Pageable pageable = PageRequest.of(page, size);
        return ResponseEntity.ok(adminUserService.getUsers(adminUserId, query, pageable));
    }

    /**
     * Updates account status (ACTIVE, LOCKED) for a user.
     */
    @PatchMapping("/{userId}/status")
    public ResponseEntity<UserResponse> updateUserStatus(
            @AuthenticationPrincipal Jwt jwt,
            @PathVariable("userId") UUID targetUserId,
            @Valid @RequestBody UpdateUserStatusRequest request) {
        UUID adminUserId = UUID.fromString(jwt.getSubject());
        UserResponse response = adminUserService.updateUserStatus(adminUserId, targetUserId, request.status(), request.expectedVersion());
        return ResponseEntity.ok(response);
    }

    /**
     * Updates user system role (USER, ADMIN).
     */
    @PatchMapping("/{userId}/role")
    public ResponseEntity<UserResponse> updateUserRole(
            @AuthenticationPrincipal Jwt jwt,
            @PathVariable("userId") UUID targetUserId,
            @Valid @RequestBody UpdateUserRoleRequest request) {
        UUID adminUserId = UUID.fromString(jwt.getSubject());
        UserResponse response = adminUserService.updateUserRole(adminUserId, targetUserId, request.systemRole(), request.expectedVersion());
        return ResponseEntity.ok(response);
    }
}
