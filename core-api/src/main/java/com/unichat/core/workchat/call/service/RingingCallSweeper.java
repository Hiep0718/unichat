package com.unichat.core.workchat.call.service;

import java.time.Duration;
import java.time.Instant;
import java.util.List;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.unichat.core.workchat.call.domain.Call;
import com.unichat.core.workchat.call.domain.CallEndReason;
import com.unichat.core.workchat.call.domain.CallRepository;

/**
 * Gives up on calls nobody answered.
 *
 * <p>A phone stops ringing by itself, and so must this: without a sweep, a
 * call whose caller closed the tab stays {@code RINGING} forever, and because
 * a live call blocks any other, both people would be unable to call anyone
 * again until someone edited the database.
 *
 * <p>Runs on a timer rather than a per-call timeout so it survives a restart.
 * A scheduled task held in memory would forget every ringing call the moment
 * the process stopped, which is exactly when stuck rows are created.
 */
@Service
public class RingingCallSweeper {

    private static final Logger log = LoggerFactory.getLogger(RingingCallSweeper.class);

    private final CallRepository callRepository;
    private final ApplicationEventPublisher events;
    private final Duration ringTimeout;

    public RingingCallSweeper(CallRepository callRepository,
                              ApplicationEventPublisher events,
                              @Value("${unichat.calls.ring-timeout-seconds:45}") long timeoutSeconds) {
        this.callRepository = callRepository;
        this.events = events;
        this.ringTimeout = Duration.ofSeconds(timeoutSeconds);
    }

    /**
     * Marks calls that have rung out.
     *
     * <p>The interval is shorter than the timeout so the delay a caller sees
     * is dominated by the timeout rather than by when the sweep happens to
     * run.
     */
    @Scheduled(fixedDelayString = "${unichat.calls.sweep-interval-ms:10000}")
    @Transactional
    public void sweep() {
        List<Call> rungOut = callRepository.findRingingSince(Instant.now().minus(ringTimeout));
        if (rungOut.isEmpty()) return;

        Instant now = Instant.now();
        rungOut.forEach(call -> {
            call.finish(CallEndReason.NO_ANSWER, now);
            // Both sides are told: the caller so the ringing tone stops, and
            // the callee so a notification for a call that is over goes away.
            events.publishEvent(new CallChangedEvent(call.getCallerId(), call));
            events.publishEvent(new CallChangedEvent(call.getCalleeId(), call));
        });

        log.debug("Gave up on {} unanswered call(s)", rungOut.size());
    }
}
