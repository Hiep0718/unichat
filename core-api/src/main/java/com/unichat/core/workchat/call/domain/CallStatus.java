package com.unichat.core.workchat.call.domain;

/**
 * Where a call has got to.
 *
 * <p>Five of the six are terminal. {@link #RINGING} and {@link #ACTIVE} are the
 * only states a call can be in while it still occupies the line, which is what
 * the "already on a call" check looks for.
 */
public enum CallStatus {

    /** Offered, not yet answered. */
    RINGING,

    /** Answered and in progress. */
    ACTIVE,

    /** Answered, then hung up by one side. */
    ENDED,

    /** The callee refused it. */
    DECLINED,

    /** Nobody picked up, or the callee had nothing connected to ring. */
    MISSED,

    /** The media connection could not be established. */
    FAILED;

    /** Whether a call in this state still occupies the line. */
    public boolean isLive() {
        return this == RINGING || this == ACTIVE;
    }
}
