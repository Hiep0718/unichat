package com.unichat.core.admin.api;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.PositiveOrZero;

/** Version-bound administrative generation admission transition. */
public record AiAdmissionRequest(@NotNull @Pattern(regexp = "OPEN|DRAINING|VERIFYING") String state,
        @NotNull @PositiveOrZero Long expectedVersion) { }
