package com.unichat.core.workchat.call.domain;

/**
 * Why a call stopped, for the line a conversation shows afterwards.
 *
 * <p>Separate from {@link CallStatus} because the same outcome can be reached
 * for different reasons: a call that is {@code MISSED} because nobody answered
 * in time reads differently from one that was never rung at all.
 */
public enum CallEndReason {

    /** One side pressed hang up. */
    HUNG_UP,

    /** The callee refused. */
    DECLINED,

    /** It rang out. */
    NO_ANSWER,

    /** The callee had no connection to ring. */
    OFFLINE,

    /** The callee was already on another call. */
    BUSY,

    /** The peer connection never came up, or dropped and did not recover. */
    CONNECTION_FAILED
}
