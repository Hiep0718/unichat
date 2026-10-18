package com.unichat.core.workchat.call.domain;

/**
 * What the caller asked for.
 *
 * <p>Only the opening request: a video call whose camera is switched off stays
 * {@code VIDEO}, because this records what was offered rather than what the
 * tracks were doing at any moment.
 */
public enum CallMedia {
    AUDIO,
    VIDEO
}
