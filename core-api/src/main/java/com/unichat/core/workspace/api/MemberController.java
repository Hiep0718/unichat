package com.unichat.core.workspace.api;

import java.util.List;
import java.util.UUID;

import jakarta.validation.Valid;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.unichat.core.workspace.service.MemberService;

/**
 * REST controller for workspace membership operations.
 * All endpoints require the caller to be the workspace OWNER.
 */
@RestController
@RequestMapping("/api/v1/workspaces/{workspaceId}/members")
public class MemberController {

    private final MemberService memberService;

    public MemberController(MemberService memberService) {
        this.memberService = memberService;
    }

    /**
     * Lists active members of a workspace.
     */
    @GetMapping
    public ResponseEntity<List<MemberResponse>> getMembers(
            @AuthenticationPrincipal Jwt jwt,
            @PathVariable("workspaceId") UUID workspaceId) {
        UUID callerId = UUID.fromString(jwt.getSubject());
        return ResponseEntity.ok(memberService.getMembers(callerId, workspaceId));
    }

    /**
     * Invites a new member to the workspace by email.
     */
    @PostMapping
    public ResponseEntity<MemberResponse> inviteMember(
            @AuthenticationPrincipal Jwt jwt,
            @PathVariable("workspaceId") UUID workspaceId,
            @Valid @RequestBody InviteMemberRequest request) {
        UUID callerId = UUID.fromString(jwt.getSubject());
        MemberResponse response = memberService.inviteMember(callerId, workspaceId, request);
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    /**
     * Changes the role of an existing workspace member.
     */
    @PatchMapping("/{userId}")
    public ResponseEntity<MemberResponse> changeRole(
            @AuthenticationPrincipal Jwt jwt,
            @PathVariable("workspaceId") UUID workspaceId,
            @PathVariable("userId") UUID userId,
            @Valid @RequestBody UpdateMemberRoleRequest request) {
        UUID callerId = UUID.fromString(jwt.getSubject());
        return ResponseEntity.ok(memberService.changeRole(callerId, workspaceId, userId, request));
    }

    /**
     * Removes a member from the workspace.
     */
    @DeleteMapping("/{userId}")
    public ResponseEntity<Void> removeMember(
            @AuthenticationPrincipal Jwt jwt,
            @PathVariable("workspaceId") UUID workspaceId,
            @PathVariable("userId") UUID userId) {
        UUID callerId = UUID.fromString(jwt.getSubject());
        memberService.removeMember(callerId, workspaceId, userId);
        return ResponseEntity.noContent().build();
    }
}
