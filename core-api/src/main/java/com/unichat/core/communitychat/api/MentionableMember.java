package com.unichat.core.communitychat.api;

import java.util.UUID;

/**
 * A member the composer can suggest when someone types {@code @}.
 *
 * <p>Carries only the handle, not the full email or role: the member roster is
 * owner-only, and mention autocomplete needs no more than the name already
 * shown beside every post.
 *
 * @param handle the name a member is mentioned by
 */
public record MentionableMember(UUID userId, String handle) {}
