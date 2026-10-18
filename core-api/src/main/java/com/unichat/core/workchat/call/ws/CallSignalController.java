package com.unichat.core.workchat.call.ws;

import java.security.Principal;
import java.util.UUID;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.messaging.handler.annotation.DestinationVariable;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.handler.annotation.Payload;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Controller;
import org.springframework.validation.annotation.Validated;

import com.unichat.core.common.error.AppError;
import com.unichat.core.workchat.call.domain.Call;
import com.unichat.core.workchat.call.service.CallService;

import jakarta.validation.Valid;

/**
 * Relays WebRTC signalling between the two browsers on a call.
 *
 * <p>Over the socket rather than REST because there are many frames per call
 * — one offer, one answer, then an ICE candidate for every network path each
 * side can see — and each one is worthless a second later. A round trip
 * through a request, a transaction and a response for each would add latency
 * to the one part of a call where latency is felt.
 *
 * <p>The server never reads the payload. It checks who is allowed to send it
 * and hands it to the other party unchanged.
 */
@Controller
@Validated
public class CallSignalController {

    private static final Logger log = LoggerFactory.getLogger(CallSignalController.class);

    private final CallService callService;
    private final SimpMessagingTemplate messagingTemplate;

    public CallSignalController(CallService callService, SimpMessagingTemplate messagingTemplate) {
        this.callService = callService;
        this.messagingTemplate = messagingTemplate;
    }

    /**
     * Forwards one frame to the other party.
     *
     * <p>Membership is checked on every frame, not once when the call starts.
     * The call id arrives in the destination, where a client puts whatever it
     * likes, and the socket carries no other evidence of which call this
     * belongs to — so taking the id on trust would let anyone signed in push
     * an offer into a call they are not on.
     *
     * <p>A rejected frame is dropped rather than answered. STOMP has no reply
     * to a SEND, and the signalling protocol tolerates a lost frame: ICE
     * retries, and an offer that never arrives ends the call as a failed
     * connection, which is the honest outcome.
     */
    @MessageMapping("/calls/{callId}/signal")
    public void relay(@DestinationVariable String callId,
                      @Payload @Valid CallSignal signal,
                      Principal principal) {
        UUID actorId = UUID.fromString(principal.getName());

        Call call;
        try {
            call = callService.requireSignalling(actorId, UUID.fromString(callId));
        } catch (AppError | IllegalArgumentException refused) {
            // The reason is kept here rather than returned: a sender probing
            // call ids should not learn which ones exist.
            log.warn("Dropped a signalling frame that was not allowed");
            return;
        }

        messagingTemplate.convertAndSendToUser(
                call.otherParty(actorId).toString(),
                CallBroadcaster.CALLS + "/signal",
                new RelayedSignal(call.getId(), signal.kind().name(), signal.payload()));
    }

    /**
     * A frame as the other browser receives it.
     *
     * @param callId  which call it belongs to
     * @param kind    OFFER, ANSWER or ICE
     * @param payload the body, exactly as the sender wrote it
     */
    public record RelayedSignal(UUID callId, String kind, String payload) {
    }
}
