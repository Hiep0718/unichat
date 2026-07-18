package com.unichat.core.admin.api;

import java.util.UUID;

import jakarta.validation.Valid;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.unichat.core.admin.service.AdminService;
import com.unichat.core.user.api.UpdateUserStatusRequest;
import com.unichat.core.user.api.UserResponse;

/**
 * Admin-only endpoints for user management and system metrics.
 */
@RestController
@RequestMapping("/api/v1/admin")
public class AdminController {

    private final AdminService adminService;

    public AdminController(AdminService adminService) {
        this.adminService = adminService;
    }

    /**
     * Searches and paginates users (Admin only).
     */
    @GetMapping("/users")
    public ResponseEntity<Page<UserResponse>> getUsers(
            @RequestParam(value = "query", required = false) String query,
            @RequestParam(value = "page", defaultValue = "0") int page,
            @RequestParam(value = "size", defaultValue = "20") int size) {
        
        int pageSize = Math.min(size, 100); // Enforce max page size of 100
        Pageable pageable = PageRequest.of(page, pageSize);
        return ResponseEntity.ok(adminService.searchUsers(query, pageable));
    }

    /**
     * Updates account status (Admin only).
     */
    @PatchMapping("/users/{userId}/status")
    public ResponseEntity<UserResponse> updateStatus(
            @PathVariable("userId") UUID userId,
            @Valid @RequestBody UpdateUserStatusRequest request) {
        return ResponseEntity.ok(adminService.updateStatus(userId, request.status()));
    }
}
