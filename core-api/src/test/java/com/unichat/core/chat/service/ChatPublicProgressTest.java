package com.unichat.core.chat.service;

import java.util.Map;
import org.junit.jupiter.api.Test;
import static org.junit.jupiter.api.Assertions.*;

class ChatPublicProgressTest {
    @Test void shouldPublishCompleteClientProgressWithoutPrivateFields() {
        for (String key:java.util.List.of("RETRIEVAL","EVIDENCE","GENERATION","VALIDATION","PERSISTENCE","unknown")) {
            var progress=ChatPublicProgress.from(Map.of("stepKey",key,"prompt","secret","attemptId","private-id"));
            assertEquals(java.util.Set.of("stepIndex","stepKey","title","detail"),progress.keySet());
            assertTrue((int)progress.get("stepIndex")>0);
            assertFalse(progress.toString().contains("secret"));
        }
    }
}
