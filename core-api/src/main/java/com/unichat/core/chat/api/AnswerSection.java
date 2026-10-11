package com.unichat.core.chat.api;

import java.util.List;

/** Separates claims grounded in documents from explicitly unverified expansion. */
public record AnswerSection(String type, String content, List<Claim> claims) {
    /** Associates a factual claim with validated citation identifiers. */
    public record Claim(String text, List<String> citationIds) { }
}
