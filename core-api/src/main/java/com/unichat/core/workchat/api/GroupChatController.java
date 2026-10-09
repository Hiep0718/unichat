package com.unichat.core.workchat.api;

import java.util.List;
import java.util.UUID;

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

import com.unichat.core.workchat.service.GroupConversationService;

import jakarta.validation.Valid;

/**
 * Group conversations and who is in them.
 *
 * <p>Separate from {@link WorkChatController}, which sends and reads messages:
 * administering a group is a different job from talking in one, and keeping
 * both in one controller is what pushed it past its size limit.
 *
 * <p>Reading messages, sending them and attachments are the same routes for a
 * group as for a one-to-one conversation, and stay on {@link WorkChatController}.
 */
@RestController
@RequestMapping("/api/v1/work-chat")
public class GroupChatController {

    private final GroupConversationService groupService;

    public GroupChatController(GroupConversationService groupService) {
        this.groupService = groupService;
    }

    /** Creates a group with the caller as its owner. */
    @PostMapping("/groups")
    public ResponseEntity<ConversationSummary> create(
            @Valid @RequestBody CreateGroupRequest request,
            @AuthenticationPrincipal Jwt jwt) {
        return ResponseEntity.ok(
                groupService.create(callerOf(jwt), request.title(), request.memberIds()));
    }

    /** Renames a group. Only its owner may. */
    @PatchMapping("/groups/{conversationId}")
    public ResponseEntity<ConversationSummary> rename(
            @PathVariable UUID conversationId,
            @Valid @RequestBody RenameGroupRequest request,
            @AuthenticationPrincipal Jwt jwt) {
        return ResponseEntity.ok(
                groupService.rename(callerOf(jwt), conversationId, request.title()));
    }

    /** Everyone in a conversation, of either kind. */
    @GetMapping("/conversations/{conversationId}/participants")
    public ResponseEntity<List<ParticipantSummary>> participants(
            @PathVariable UUID conversationId,
            @AuthenticationPrincipal Jwt jwt) {
        return ResponseEntity.ok(groupService.listParticipants(callerOf(jwt), conversationId));
    }

    /** Adds someone the caller could already message one-to-one. */
    @PostMapping("/groups/{conversationId}/members")
    public ResponseEntity<List<ParticipantSummary>> addMember(
            @PathVariable UUID conversationId,
            @Valid @RequestBody AddMemberRequest request,
            @AuthenticationPrincipal Jwt jwt) {
        return ResponseEntity.ok(
                groupService.addMember(callerOf(jwt), conversationId, request.userId()));
    }

    /** Removes someone. Only the owner may, and not themselves. */
    @DeleteMapping("/groups/{conversationId}/members/{userId}")
    public ResponseEntity<List<ParticipantSummary>> removeMember(
            @PathVariable UUID conversationId,
            @PathVariable UUID userId,
            @AuthenticationPrincipal Jwt jwt) {
        return ResponseEntity.ok(
                groupService.removeMember(callerOf(jwt), conversationId, userId));
    }

    /**
     * Leaves a group.
     *
     * <p>Its own route rather than removing yourself, because an owner leaving
     * also hands the group on.
     */
    @PostMapping("/groups/{conversationId}/leave")
    public ResponseEntity<Void> leave(
            @PathVariable UUID conversationId,
            @AuthenticationPrincipal Jwt jwt) {
        groupService.leave(callerOf(jwt), conversationId);
        return ResponseEntity.noContent().build();
    }

    private static UUID callerOf(Jwt jwt) {
        return UUID.fromString(jwt.getSubject());
    }
}
