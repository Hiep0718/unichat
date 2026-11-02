package com.unichat.core.workchat.api;

import java.util.UUID;

import com.unichat.core.workchat.domain.ParticipantRole;

/**
 * Someone in a conversation, as shown to the caller.
 *
 * @param role whether they may rename the group or change who is in it
 * @param me   whether this is the caller, so the UI need not compare ids
 */
public record ParticipantSummary(
        UUID userId,
        String name,
        ParticipantRole role,
        boolean me
) {}
