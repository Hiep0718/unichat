package com.unichat.core.communitychat.service;

import java.util.regex.Pattern;

/**
 * The one rule for spotting {@code @AI} in a comment.
 *
 * <p>The handle must stand alone: an e-mail such as {@code x@ai.edu.vn} or a
 * name such as {@code @aiden} does not call the assistant. The web and mobile
 * clients apply the same rule, so they wait for an answer exactly when the
 * server is going to write one.
 */
public final class AiMentions {

    private static final Pattern HANDLE = Pattern.compile(
            "(?<![\\w.@])@ai\\b(?!\\.\\w)",
            Pattern.CASE_INSENSITIVE | Pattern.UNICODE_CHARACTER_CLASS);

    private AiMentions() {
    }

    /**
     * Tells whether a comment asks the assistant something.
     *
     * @param body the comment text
     * @return true when the text carries a standalone {@code @AI} handle
     */
    public static boolean mentions(String body) {
        return body != null && HANDLE.matcher(body).find();
    }

    /**
     * Removes every {@code @AI} handle, leaving the question itself.
     *
     * @param body the comment text
     * @return the text without the handle, trimmed
     */
    public static String strip(String body) {
        return HANDLE.matcher(body).replaceAll("").replaceAll("\\s{2,}", " ").trim();
    }
}
