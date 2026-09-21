package com.unichat.core.communitychat.service;

import java.util.LinkedHashSet;
import java.util.List;
import java.util.Set;
import java.util.UUID;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

import org.springframework.stereotype.Component;

import com.unichat.core.communitychat.api.MentionableMember;
import com.unichat.core.user.domain.User;
import com.unichat.core.user.domain.UserRepository;
import com.unichat.core.workspace.domain.WorkspaceMember;
import com.unichat.core.workspace.domain.WorkspaceMemberRepository;
import com.unichat.core.workspace.domain.WorkspaceMemberStatus;

/**
 * Finds the members a piece of text mentions.
 *
 * <p>A mention is written as {@code @handle}, where the handle is the part of
 * the member's email before the {@code @} — the same name shown as the author
 * everywhere else in the UI, since the user record carries no display name yet.
 *
 * <p>Only active members of the workspace can be mentioned: a mention is an
 * invitation to read the post, so it must not reach anyone who cannot open it.
 */
@Component
public class MentionResolver {

    /** Matches @handle where the handle is the email local-part. */
    private static final Pattern MENTION = Pattern.compile("@([A-Za-z0-9._-]{2,64})");

    /** Guards against a post mentioning half the class at once. */
    private static final int MAX_MENTIONS = 20;

    private final WorkspaceMemberRepository memberRepository;
    private final UserRepository userRepository;

    public MentionResolver(WorkspaceMemberRepository memberRepository, UserRepository userRepository) {
        this.memberRepository = memberRepository;
        this.userRepository = userRepository;
    }

    /**
     * Resolves the mentions in a text to workspace members.
     *
     * @param workspaceId workspace whose members may be mentioned
     * @param text        post or reply body
     * @param excluding   author, who is never notified of their own mention
     * @return ids of mentioned members, at most {@value #MAX_MENTIONS}
     */
    public List<UUID> resolve(UUID workspaceId, String text, UUID excluding) {
        Set<String> handles = extractHandles(text);
        if (handles.isEmpty()) {
            return List.of();
        }

        List<UUID> memberIds = memberRepository
                .findByWorkspaceIdAndStatus(workspaceId, WorkspaceMemberStatus.ACTIVE)
                .stream()
                .map(WorkspaceMember::getUserId)
                .toList();

        if (memberIds.isEmpty()) {
            return List.of();
        }

        return userRepository.findAllById(memberIds).stream()
                .filter(user -> handles.contains(handleOf(user)))
                .map(User::getId)
                .filter(id -> !id.equals(excluding))
                .limit(MAX_MENTIONS)
                .toList();
    }

    /** The handle a member is mentioned by. */
    public static String handleOf(User user) {
        return user.getEmail().split("@")[0].toLowerCase();
    }

    /**
     * Members the composer may suggest, for anyone who belongs to the group.
     *
     * <p>Deliberately narrower than the member roster, which is owner-only:
     * this exposes just the handle already shown beside every post.
     */
    public List<MentionableMember> listMentionable(UUID workspaceId) {
        List<UUID> memberIds = memberRepository
                .findByWorkspaceIdAndStatus(workspaceId, WorkspaceMemberStatus.ACTIVE)
                .stream()
                .map(WorkspaceMember::getUserId)
                .toList();

        if (memberIds.isEmpty()) {
            return List.of();
        }

        return userRepository.findAllById(memberIds).stream()
                .map(user -> new MentionableMember(user.getId(), handleOf(user)))
                .sorted((a, b) -> a.handle().compareTo(b.handle()))
                .toList();
    }

    private static Set<String> extractHandles(String text) {
        if (text == null || text.isBlank()) {
            return Set.of();
        }
        Set<String> handles = new LinkedHashSet<>();
        Matcher matcher = MENTION.matcher(text);
        while (matcher.find() && handles.size() < MAX_MENTIONS) {
            handles.add(matcher.group(1).toLowerCase());
        }
        return handles;
    }
}
