package com.unichat.core.chat.service;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;

class WorkspaceSummaryIntentDetectorTest {
    @ParameterizedTest
    @ValueSource(strings = {
            "Tóm tắt toàn bộ tài liệu",
            "tom tat tat ca tai lieu giup minh",
            "Hãy tóm tắt các tài liệu trong kho này",
            "Cho tôi tổng quan kho tri thức",
            "Tổng quan về toàn bộ tài liệu được cấp quyền",
            "Tổng hợp toàn bộ tài liệu trong kho",
            "Tóm tắt toàn bộ bài giảng",
            "Tóm tắt giúp mình toàn bộ nội dung tài liệu",
            "Khái quát toàn bộ nội dung",
            "TÓM TẮT   HẾT TÀI LIỆU",
            "Summarize all documents",
            "Give me an overview of the workspace",
            "Tóm tắt toàn bộ tài liệu trong kho tri thức."
    })
    void shouldDetectCollectionWideSummaryRequests(String question) {
        // Arrange, Act
        boolean detected = WorkspaceSummaryIntentDetector.isWorkspaceSummary(question);

        // Assert
        assertTrue(detected, question);
    }

    @ParameterizedTest
    @ValueSource(strings = {
            "Tóm tắt chương 3",
            "Tóm tắt phần mở đầu của tất cả tài liệu",
            "Tóm tắt toàn bộ tài liệu về kiến trúc microservices",
            "Tóm tắt kiến trúc microservices trong toàn bộ tài liệu",
            "Tóm tắt về REST và gRPC trong kho tri thức",
            "Tóm tắt các ý chính có bằng chứng trong tài liệu.",
            "Tóm tắt file kien-truc.pdf",
            "So sánh và tóm tắt tất cả tài liệu",
            "Không cần tóm tắt toàn bộ tài liệu, chỉ giải thích RAG",
            "Liệt kê tất cả tài liệu",
            "Kiến trúc microservices là gì?",
            "Tóm tắt slide 12 của toàn bộ tài liệu",
            "Summarize all documents about caching",
            "Summarize caching strategies across all documents"
    })
    void shouldKeepScopedOrNonSummaryQuestionsAsQuestions(String question) {
        // Arrange, Act
        boolean detected = WorkspaceSummaryIntentDetector.isWorkspaceSummary(question);

        // Assert
        assertFalse(detected, question);
    }

    @ParameterizedTest
    @ValueSource(strings = {"", "   "})
    void shouldRejectBlankQuestions(String question) {
        assertFalse(WorkspaceSummaryIntentDetector.isWorkspaceSummary(question));
    }
}
