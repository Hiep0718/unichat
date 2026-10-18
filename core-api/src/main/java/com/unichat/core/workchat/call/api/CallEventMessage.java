package com.unichat.core.workchat.call.api;

import java.util.UUID;

import com.unichat.core.workchat.call.domain.Call;

/**
 * What the browser receives on {@code /user/queue/calls}.
 *
 * <p>One shape for every lifecycle change rather than a type per event: the
 * client switches on {@code status} anyway, and a single shape means a frame
 * it does not recognise can still be parsed and ignored.
 *
 * @param callId         the call this concerns
 * @param conversationId where it belongs, so the client can open the right thread
 * @param peerId         the other person, seen from the recipient's side
 * @param incoming       whether the recipient is being rung rather than ringing
 * @param media          what was offered
 * @param status         where the call has got to
 * @param endReason      why it stopped, or null while it is still live
 */
public record CallEventMessage(
        UUID callId,
        UUID conversationId,
        UUID peerId,
        boolean incoming,
        String media,
        String status,
        String endReason) {

    /** Describes a call from one recipient's point of view. */
    public static CallEventMessage forRecipient(Call call, UUID recipientId) {
        return new CallEventMessage(
                call.getId(),
                call.getConversationId(),
                call.otherParty(recipientId),
                call.getCalleeId().equals(recipientId),
                call.getMedia().name(),
                call.getStatus().name(),
                call.getEndReason() == null ? null : call.getEndReason().name());
    }
}
