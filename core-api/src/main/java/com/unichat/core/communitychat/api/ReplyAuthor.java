package com.unichat.core.communitychat.api;

import com.unichat.core.user.domain.User;

/**
 * What a reader needs to draw a reply's author: the name, whether a picture
 * exists to fetch, and the colour the author chose for their initial.
 *
 * <p>Only a flag about the picture, never its storage key: the client fetches
 * it through the avatar endpoint, which applies its own access rules.
 *
 * @param name        display name shown on the reply
 * @param hasAvatar   whether the author uploaded a picture
 * @param avatarColor the chosen colour key ({@code navy}, {@code teal}, …), or
 *                    null to let the client derive one from the name
 */
public record ReplyAuthor(String name, boolean hasAvatar, String avatarColor) {

    /** Shown when the author's account can no longer be found. */
    public static final ReplyAuthor UNKNOWN = new ReplyAuthor("Người dùng", false, null);

    /**
     * Builds the author card from an account.
     *
     * @param user the reply's author
     * @return the name, picture flag and colour for that account
     */
    public static ReplyAuthor of(User user) {
        return new ReplyAuthor(
                user.getDisplayName(),
                user.hasAvatarImage(),
                user.getAvatarColor() == null ? null : user.getAvatarColor().key());
    }
}
