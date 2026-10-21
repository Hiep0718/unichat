package com.unichat.core.admin.api;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;

/** Stable key registry identifier, never a raw provider secret. */
public record VerifyKeyRequest(@NotBlank @Pattern(regexp = "(gemini|hive)-(primary|secondary|list-[a-f0-9]{12})") String keyId) { }
