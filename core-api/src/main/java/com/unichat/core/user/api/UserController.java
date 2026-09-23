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
    private final com.unichat.core.user.service.AvatarService avatarService;
    private final com.unichat.core.user.service.MemberProfileService profileService;

    public UserController(UserService userService,
                          com.unichat.core.user.service.AvatarService avatarService,
                          com.unichat.core.user.service.MemberProfileService profileService) {
        this.userService = userService;
        this.avatarService = avatarService;
        this.profileService = profileService;
    }

    /**
     * A member's profile, as the caller is entitled to see it.
     *
     * <p>Scoped to groups the two share; someone with none in common is
     * reported as not found, which is the same answer as not existing.
     */
    @GetMapping("/users/{userId}/profile")
    public ResponseEntity<MemberProfile> profile(
            @PathVariable UUID userId,
            @AuthenticationPrincipal Jwt jwt) {
        UUID viewerId = UUID.fromString(jwt.getSubject());
        return ResponseEntity.ok(profileService.profileOf(viewerId, userId));
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
     * Changes the password of the authenticated user.
     */
    /** Renames the caller. The mention handle is unaffected. */
    @PatchMapping("/users/me")
    public ResponseEntity<UserResponse> updateProfile(
            @jakarta.validation.Valid @org.springframework.web.bind.annotation.RequestBody
            UpdateProfileRequest request,
            @AuthenticationPrincipal Jwt jwt) {
        UUID userId = UUID.fromString(jwt.getSubject());
        return ResponseEntity.ok(userService.updateProfile(userId, request));
    }

    /** Replaces the caller's profile picture. */
    @org.springframework.web.bind.annotation.PutMapping("/users/me/avatar")
    public ResponseEntity<Void> uploadAvatar(
            @org.springframework.web.bind.annotation.RequestPart("file")
            org.springframework.web.multipart.MultipartFile file,
            @AuthenticationPrincipal Jwt jwt) {
        avatarService.upload(UUID.fromString(jwt.getSubject()), file);
        return ResponseEntity.noContent().build();
    }

    /** Removes the picture, leaving the letter avatar. */
    @org.springframework.web.bind.annotation.DeleteMapping("/users/me/avatar")
    public ResponseEntity<Void> removeAvatar(@AuthenticationPrincipal Jwt jwt) {
        avatarService.remove(UUID.fromString(jwt.getSubject()));
        return ResponseEntity.noContent().build();
    }

    /** Chooses the letter-avatar colour; an absent value returns to the derived one. */
    @PatchMapping("/users/me/avatar-color")
    public ResponseEntity<Void> chooseAvatarColour(
            @org.springframework.web.bind.annotation.RequestParam(required = false) String color,
            @AuthenticationPrincipal Jwt jwt) {
        avatarService.chooseColour(UUID.fromString(jwt.getSubject()), color);
        return ResponseEntity.noContent().build();
    }

    /**
     * Serves a member's picture.
     *
     * <p>Any signed-in member may read one. A per-request membership check
     * would mean a query for every avatar on a feed of twenty posts, and the
     * id needed to ask is a UUID that is only learned from content the caller
     * can already see.
     */
    @GetMapping("/users/{userId}/avatar")
    public ResponseEntity<byte[]> avatar(@PathVariable UUID userId) {
        byte[] image = avatarService.read(userId);
        return ResponseEntity.ok()
                .header(org.springframework.http.HttpHeaders.CONTENT_TYPE,
                        com.unichat.core.user.service.AvatarService.STORED_MEDIA_TYPE)
                // Short and private: an avatar changes rarely, but a stale one
                // must not follow the member around for the rest of the day.
                .header(org.springframework.http.HttpHeaders.CACHE_CONTROL, "private, max-age=300")
                .body(image);
    }

    @PatchMapping("/users/me/password")
    public ResponseEntity<Void> changePassword(
            @AuthenticationPrincipal org.springframework.security.oauth2.jwt.Jwt jwt,
            @Valid @RequestBody ChangePasswordRequest request) {
        UUID userId = UUID.fromString(jwt.getSubject());
        userService.changePassword(userId, request);
        return ResponseEntity.noContent().build();
    }
}
