package com.unichat.core.chat.service;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertThrows;

import org.junit.jupiter.api.Test;
import com.unichat.core.chat.api.AskQuestionRequest;
import com.unichat.core.chat.api.ChatTaskType;
import com.unichat.core.common.error.ValidationError;

class ChatTaskRouterTest {
    private static final String WHOLE = "Tóm tắt toàn bộ tài liệu";

    @Test
    void shouldRouteInferredWholeWorkspaceSummaryWhenPipelineEnabled() {
        // Arrange
        var request = new AskQuestionRequest(WHOLE, null, false, null);

        // Act
        var binding = ChatTaskRouter.route(ChatFixture.WORKSPACE, request, true);

        // Assert
        assertEquals(ChatTaskType.WORKSPACE_SUMMARY, binding.taskType());
        assertEquals(WHOLE, binding.question());
    }

    @Test
    void shouldGroundInferredSummaryEvenWhenExpandedModeWasRequested() {
        var request = new AskQuestionRequest(WHOLE, null, true, null);

        var binding = ChatTaskRouter.route(ChatFixture.WORKSPACE, request, true);

        assertEquals(ChatTaskType.WORKSPACE_SUMMARY, binding.taskType());
        assertFalse(binding.expanded());
    }

    @Test
    void shouldKeepQuestionWhenSummaryPipelineDisabled() {
        var request = new AskQuestionRequest(WHOLE, null, false, null);

        var binding = ChatTaskRouter.route(ChatFixture.WORKSPACE, request, false);

        assertEquals(ChatTaskType.QUESTION, binding.taskType());
    }

    @Test
    void shouldHonourExplicitQuestionTaskType() {
        var request = new AskQuestionRequest(WHOLE, null, false, ChatTaskType.QUESTION);

        var binding = ChatTaskRouter.route(ChatFixture.WORKSPACE, request, true);

        assertEquals(ChatTaskType.QUESTION, binding.taskType());
    }

    @Test
    void shouldKeepScopedSummaryAsQuestion() {
        var request = new AskQuestionRequest("Tóm tắt chương 2", null, false, null);

        var binding = ChatTaskRouter.route(ChatFixture.WORKSPACE, request, true);

        assertEquals(ChatTaskType.QUESTION, binding.taskType());
    }

    @Test
    void shouldStillRejectExplicitExpandedWorkspaceSummary() {
        var request = new AskQuestionRequest(WHOLE, null, true, ChatTaskType.WORKSPACE_SUMMARY);

        assertThrows(ValidationError.class, () -> ChatTaskRouter.route(ChatFixture.WORKSPACE, request, true));
    }

    @Test
    void shouldProduceSameBindingForSameInputSoIdempotentRetriesReplay() {
        var request = new AskQuestionRequest(WHOLE, null, false, null);
        var json = new ChatJson(new tools.jackson.databind.ObjectMapper());

        var first = ChatTaskRouter.route(ChatFixture.WORKSPACE, request, true);
        var second = ChatTaskRouter.route(ChatFixture.WORKSPACE, request, true);

        assertEquals(first.hash(json), second.hash(json));
    }
}

