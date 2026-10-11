package com.unichat.core.admin.api;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

/** Explicit admin prompt input, independent of workspace documents or chat histories. */
public record QuickPromptRequest(@NotBlank @Size(max = 2000) String prompt,
        @NotBlank @Pattern(regexp = "gemini-primary|gemini-secondary|gemini-list-[a-f0-9]{12}") String keyId,
        @NotBlank @Size(max = 100) @Pattern(regexp = "[A-Za-z0-9._/-]+") String model) { }
