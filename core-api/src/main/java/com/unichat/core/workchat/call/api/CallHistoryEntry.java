package com.unichat.core.workchat.call.api;

import java.time.Instant;
import java.util.UUID;

import com.unichat.core.workchat.call.domain.Call;

/**
 * One line in a conversation's call history.
 *
 * <p>Carries {@code outgoing} and {@code talkSeconds} ready-made rather than
 * the raw timestamps, because every client would otherwise derive the same two
 * values from the same four fields, and a duration measured from the wrong
 * one reads as a plausible number rather than an error.
 *
 * @param outgoing    whether the reader placed the call
 * @param talkSeconds time connected; zero when nobody answered
 */
public record CallHistoryEntry(
        UUID id,
        boolean outgoing,
        String media,
        String status,
        Instant startedAt,
        long talkSeconds) {

    public static CallHistoryEntry forReader(Call call, UUID readerId) {
        return new CallHistoryEntry(
                call.getId(),
                call.getCallerId().equals(readerId),
                call.getMedia().name(),
                call.getStatus().name(),
                call.getStartedAt(),
                call.talkTime().toSeconds());
    }
}
