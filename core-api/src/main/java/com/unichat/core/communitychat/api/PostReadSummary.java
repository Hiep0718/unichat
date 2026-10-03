package com.unichat.core.communitychat.api;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

/**
 * Who has opened a post.
 *
 * <p>Everyone in the group sees the counts. Only owners and editors see the
 * names: whoever posted an announcement needs to know who has not read it, but a
 * member should not be able to audit their classmates' reading habits.
 *
 * @param readCount    members who opened the post
 * @param memberCount  active members of the group
 * @param hasRead      whether the caller has opened it
 * @param readers      who opened it, empty unless the caller may moderate
 * @param notYetRead   who has not, empty unless the caller may moderate
 */
public record PostReadSummary(
        long readCount,
        long memberCount,
        boolean hasRead,
        List<Reader> readers,
        List<Reader> notYetRead
) {
    /**
     * @param readAt when they opened it, null for someone who has not
     */
    public record Reader(UUID userId, String handle, Instant readAt) {}
}
