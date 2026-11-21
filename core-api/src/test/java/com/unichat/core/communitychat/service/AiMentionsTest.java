package com.unichat.core.communitychat.service;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.junit.jupiter.api.Test;

/**
 * Only a standalone {@code @AI} calls the assistant; addresses and names that
 * merely start with it do not.
 */
class AiMentionsTest {

    @ParameterizedTest
    @ValueSource(strings = {"@AI giải thích giúp", "hỏi @ai nhé", "(@Ai) là gì?", "cảm ơn @AI.", "@ai, vì sao?"})
    void shouldCallTheAssistantForAStandaloneHandle(String body) {
        // Act
        boolean mentioned = AiMentions.mentions(body);

        // Assert
        assertTrue(mentioned);
    }

    @ParameterizedTest
    @ValueSource(strings = {"gửi x@ai.edu.vn", "@aiden xem giúp", "@ai_team", "@ai.edu.vn", "@aiđ", "không nhắc ai"})
    void shouldIgnoreAddressesAndNamesThatOnlyStartWithTheHandle(String body) {
        // Act
        boolean mentioned = AiMentions.mentions(body);

        // Assert
        assertFalse(mentioned);
    }

    @Test
    void shouldTreatAMissingBodyAsNoMention() {
        // Act & Assert
        assertFalse(AiMentions.mentions(null));
    }

    @Test
    void shouldLeaveOnlyTheQuestionWhenTheHandleIsRemoved() {
        // Act
        String question = AiMentions.strip("  @AI   chỉ mục là gì  @ai ");

        // Assert
        assertEquals("chỉ mục là gì", question);
    }
}
