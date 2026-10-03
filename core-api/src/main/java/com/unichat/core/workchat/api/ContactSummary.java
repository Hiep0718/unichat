package com.unichat.core.workchat.api;

import java.util.UUID;

/**
 * Someone the caller may start a conversation with.
 *
 * @param sharedGroup name of a group both people belong to, which is what
 *                    grants the permission to message them at all
 */
public record ContactSummary(
        UUID userId,
        String name,
        String sharedGroup
) {}
