package com.unichat.core.user.domain;

import java.util.Arrays;
import java.util.Locale;
import java.util.Optional;

/**
 * The colours a member may pick for their letter avatar.
 *
 * <p>A fixed set rather than free-form hex: an arbitrary colour behind white
 * initials is easily unreadable, and these are chosen to carry the contrast.
 * The stored value is the name; the hex lives in the stylesheet, so the two
 * cannot drift into disagreeing about what "navy" is.
 */
public enum AvatarColor {

    NAVY, TEAL, PLUM, MOSS, CLAY, SLATE;

    /** The form stored in the database and sent to clients. */
    public String key() {
        return name().toLowerCase(Locale.ROOT);
    }

    /**
     * Parses a colour the client asked for.
     *
     * @return empty when the name is not one this app offers, which the caller
     *         reports rather than silently falling back to a default
     */
    public static Optional<AvatarColor> fromKey(String key) {
        if (key == null) {
            return Optional.empty();
        }
        String wanted = key.trim().toLowerCase(Locale.ROOT);
        return Arrays.stream(values())
                .filter(colour -> colour.key().equals(wanted))
                .findFirst();
    }
}
