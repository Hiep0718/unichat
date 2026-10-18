package com.unichat.core.workchat.call.api;

import java.time.Instant;
import java.util.UUID;

import com.unichat.core.workchat.call.domain.Call;

/**
 * A call as its two participants see it.
 *
 * @param endReason why it stopped, or null while it is still live
 */
public record CallResponse(
        UUID id,
        UUID conversationId,
        UUID callerId,
        UUID calleeId,
        String media,
        String status,
        Instant startedAt,
        Instant answeredAt,
        Instant endedAt,
        String endReason) {

    public static CallResponse from(Call call) {
        return new CallResponse(
                call.getId(),
                call.getConversationId(),
                call.getCallerId(),
                call.getCalleeId(),
                call.getMedia().name(),
                call.getStatus().name(),
                call.getStartedAt(),
                call.getAnsweredAt(),
                call.getEndedAt(),
                call.getEndReason() == null ? null : call.getEndReason().name());
    }
}
