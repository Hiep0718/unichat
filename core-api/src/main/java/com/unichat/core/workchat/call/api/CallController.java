package com.unichat.core.workchat.call.api;

import java.util.UUID;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.unichat.core.workchat.call.domain.Call;
import com.unichat.core.workchat.call.service.CallService;
import com.unichat.core.workchat.call.service.IceServerProvider;

import jakarta.validation.Valid;

/**
 * The lifecycle of a call: ring, answer, refuse, hang up, and look back.
 *
 * <p>Over REST rather than the socket, unlike the signalling. These happen
 * once or twice per call, each one changes stored state, and each has a
 * failure a person needs to read — already on another call, no longer
 * ringing, not your call to answer. A STOMP SEND has no reply to carry that.
 */
@RestController
public class CallController {

    /** Matches the project's list default; a history panel never needs more. */
    private static final int MAX_PAGE_SIZE = 100;
    private static final int DEFAULT_PAGE_SIZE = 20;

    private final CallService callService;
    private final IceServerProvider iceServers;

    public CallController(CallService callService, IceServerProvider iceServers) {
        this.callService = callService;
        this.iceServers = iceServers;
    }

    /**
     * Rings the other person in a one-to-one conversation.
     *
     * <p>201 even when the callee is offline or busy: the call happened and is
     * recorded, and the response says so in its status. The caller's client
     * reads that rather than an error, because "nobody picked up" is an
     * outcome of calling, not a failure to call.
     */
    @PostMapping("/conversations/{conversationId}/calls")
    public ResponseEntity<CallResponse> start(@PathVariable UUID conversationId,
                                              @Valid @RequestBody StartCallRequest request,
                                              @AuthenticationPrincipal Jwt jwt) {
        Call call = callService.start(callerId(jwt), conversationId, request.media());
        return ResponseEntity.status(HttpStatus.CREATED).body(CallResponse.from(call));
    }

    @PostMapping("/calls/{callId}/accept")
    public ResponseEntity<CallResponse> accept(@PathVariable UUID callId,
                                               @AuthenticationPrincipal Jwt jwt) {
        return ResponseEntity.ok(CallResponse.from(callService.answer(callerId(jwt), callId)));
    }

    @PostMapping("/calls/{callId}/decline")
    public ResponseEntity<CallResponse> decline(@PathVariable UUID callId,
                                                @AuthenticationPrincipal Jwt jwt) {
        return ResponseEntity.ok(CallResponse.from(callService.decline(callerId(jwt), callId)));
    }

    @PostMapping("/calls/{callId}/end")
    public ResponseEntity<CallResponse> end(@PathVariable UUID callId,
                                            @AuthenticationPrincipal Jwt jwt) {
        return ResponseEntity.ok(CallResponse.from(callService.hangUp(callerId(jwt), callId)));
    }

    /**
     * Reports that the media connection never came up.
     *
     * <p>Only the browsers can know this: the media never passes through this
     * server, so a call that fails after both sides agreed to it would
     * otherwise sit as {@code ACTIVE} until something swept it.
     */
    @PostMapping("/calls/{callId}/failed")
    public ResponseEntity<CallResponse> failed(@PathVariable UUID callId,
                                               @AuthenticationPrincipal Jwt jwt) {
        return ResponseEntity.ok(CallResponse.from(callService.reportFailed(callerId(jwt), callId)));
    }

    /**
     * The ICE servers this caller should use.
     *
     * <p>Not cached: the TURN credentials in it expire, so a stored copy would
     * be a copy of something that stops working.
     */
    @GetMapping("/calls/ice-servers")
    public ResponseEntity<IceServersResponse> iceServers() {
        return ResponseEntity.ok(iceServers.forCaller());
    }

    /** One conversation's calls, newest first. */
    @GetMapping("/conversations/{conversationId}/calls")
    public ResponseEntity<Page<CallHistoryEntry>> history(
            @PathVariable UUID conversationId,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            @AuthenticationPrincipal Jwt jwt) {
        UUID readerId = callerId(jwt);
        PageRequest pageRequest = PageRequest.of(Math.max(page, 0), clamp(size));

        return ResponseEntity.ok(callService.history(readerId, conversationId, pageRequest)
                .map(call -> CallHistoryEntry.forReader(call, readerId)));
    }

    private static int clamp(int size) {
        if (size < 1) return DEFAULT_PAGE_SIZE;
        return Math.min(size, MAX_PAGE_SIZE);
    }

    private static UUID callerId(Jwt jwt) {
        return UUID.fromString(jwt.getSubject());
    }
}
