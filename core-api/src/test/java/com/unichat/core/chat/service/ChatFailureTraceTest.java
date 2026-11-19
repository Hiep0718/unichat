package com.unichat.core.chat.service;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

import org.junit.jupiter.api.Test;

/** An unexpected failure is located in the log without quoting its data. */
class ChatFailureTraceTest {

    @Test
    void shouldNameTheTypesAndPlacesButNotTheMessage() {
        // Arrange: a parse error that quotes a document excerpt.
        RuntimeException error = new IllegalStateException("wrap",
                new NumberFormatException("Trích đoạn tài liệu bí mật"));

        // Act
        String trace = ChatFailureTrace.of(error);

        // Assert
        assertTrue(trace.contains("java.lang.IllegalStateException at "));
        assertTrue(trace.contains("caused by java.lang.NumberFormatException"));
        assertTrue(trace.contains("ChatFailureTraceTest"));
        assertFalse(trace.contains("bí mật"));
        assertFalse(trace.contains("wrap"));
    }
}
