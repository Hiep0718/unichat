package com.unichat.core.workchat.api;

import java.util.List;
import java.util.UUID;

import org.springframework.http.HttpHeaders;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestPart;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import com.unichat.core.workchat.service.GroupAvatarService;
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
    private final GroupAvatarService avatarService;

    public GroupChatController(GroupConversationService groupService,
                               GroupAvatarService avatarService) {
        this.groupService = groupService;
        this.avatarService = avatarService;
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

    /** Replaces a group's picture. Only its owner may. */
    @PutMapping("/groups/{conversationId}/avatar")
    public ResponseEntity<Void> uploadAvatar(
            @PathVariable UUID conversationId,
            @RequestPart("file") MultipartFile file,
            @AuthenticationPrincipal Jwt jwt) {
        avatarService.upload(callerOf(jwt), conversationId, file);
        return ResponseEntity.noContent().build();
    }

    /** Removes the picture, leaving the drawn fallback. Only the owner may. */
    @DeleteMapping("/groups/{conversationId}/avatar")
    public ResponseEntity<Void> removeAvatar(
            @PathVariable UUID conversationId,
            @AuthenticationPrincipal Jwt jwt) {
        avatarService.remove(callerOf(jwt), conversationId);
        return ResponseEntity.noContent().build();
    }

    /**
     * A group's picture, for anyone taking part in it.
     *
     * <p>Under /conversations rather than /groups because it is read with the
     * conversation id the list already holds, and a caller who is not a
     * participant is told the conversation does not exist either way.
     */
    @GetMapping("/conversations/{conversationId}/avatar")
    public ResponseEntity<byte[]> avatar(
            @PathVariable UUID conversationId,
            @AuthenticationPrincipal Jwt jwt) {
        byte[] image = avatarService.read(callerOf(jwt), conversationId);
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_TYPE, GroupAvatarService.STORED_MEDIA_TYPE)
                // Short and private, as for a profile picture: it changes
                // rarely, but a stale one must not follow the group around.
                .header(HttpHeaders.CACHE_CONTROL, "private, max-age=300")
                .body(image);
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
