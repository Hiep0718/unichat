package com.unichat.core.chat.service;

import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;
import java.util.stream.Collectors;

/**
 * Describes an unexpected failure for the log without its message.
 *
 * <p>An unexpected exception used to be reduced to the code CHAT_FAILED, which
 * says that something broke but not what or where. Its message cannot be
 * logged as is: parsing and persistence errors quote the data they choked on,
 * and here that data is prompts, answers and document excerpts. The exception
 * types along the cause chain and the frames where each was thrown say where
 * to look without carrying any of it.
 */
final class ChatFailureTrace {

    private static final int FRAMES = 6;
    private static final int CAUSES = 4;

    private ChatFailureTrace() {
    }

    /**
     * @param error the unexpected failure
     * @return exception types with their first frames, outermost first
     */
    static String of(Throwable error) {
        List<String> parts = new ArrayList<>();
        Throwable current = error;
        while (current != null && parts.size() < CAUSES) {
            String frames = Arrays.stream(current.getStackTrace())
                    .limit(FRAMES)
                    .map(StackTraceElement::toString)
                    .collect(Collectors.joining(" <- "));
            parts.add(current.getClass().getName() + " at " + frames);
            current = current.getCause() == current ? null : current.getCause();
        }
        return String.join(" | caused by ", parts);
    }
}
