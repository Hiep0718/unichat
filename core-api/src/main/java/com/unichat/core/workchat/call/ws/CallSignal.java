package com.unichat.core.workchat.call.ws;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

/**
 * One WebRTC signalling frame, passed between two browsers.
 *
 * <p>The server does not read {@code payload}. It is an SDP description or an
 * ICE candidate, meaningful only to the two peers, and parsing it here would
 * make this a participant in the negotiation rather than a relay.
 *
 * <p>It is size-limited all the same. Nothing else bounds what a client can
 * push through an open socket, and an SDP that does not fit comfortably in
 * sixteen kilobytes is not an SDP.
 *
 * @param kind    OFFER, ANSWER or ICE
 * @param payload the opaque body, forwarded unchanged
 */
public record CallSignal(
        @NotNull(message = "Thiếu loại tín hiệu") SignalKind kind,
        @NotBlank(message = "Thiếu nội dung tín hiệu")
        @Size(max = 16_384, message = "Tín hiệu quá lớn") String payload) {

    /** What the frame is for. */
    public enum SignalKind {
        OFFER,
        ANSWER,
        ICE
    }
}
