package com.unichat.core.chat.service;

import java.util.Map;

/** Builds public progress from known pipeline stages without exposing provider internals. */
public final class ChatPublicProgress {
    private ChatPublicProgress() { }

    /** Replaces private provider payloads with a complete, validated client progress DTO. */
    public static Map<String, Object> from(Object payload) {
        String key = payload instanceof Map<?, ?> values && values.get("stepKey") instanceof String value
                ? value : "GENERATION";
        return switch (key) {
            case "RETRIEVAL" -> stage(1, key, "Truy hồi", "Đang tìm nguồn được phép.");
            case "EVIDENCE" -> stage(2, key, "Kiểm bằng chứng", "Đang kiểm tra bằng chứng từ tài liệu.");
            case "VALIDATION" -> stage(4, key, "Kiểm trích dẫn", "Đang kiểm tra trích dẫn và nội dung.");
            case "PERSISTENCE" -> stage(5, key, "Lưu kết quả", "Đang lưu câu trả lời đã kiểm tra.");
            default -> stage(3, "GENERATION", "Sinh câu trả lời", "Đang tạo nội dung tạm thời.");
        };
    }

    private static Map<String, Object> stage(int index, String key, String title, String detail) {
        return Map.of("stepIndex", index, "stepKey", key, "title", title, "detail", detail);
    }
}
