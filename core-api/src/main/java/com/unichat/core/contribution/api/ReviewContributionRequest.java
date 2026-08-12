package com.unichat.core.contribution.api;

import jakarta.validation.constraints.NotNull;

/**
 * Request payload for reviewing a contributed document.
 */
public record ReviewContributionRequest(
    @NotNull(message = "Quyết định duyệt không được để trống")
    Boolean approved,

    String reason
) {}
