package com.unichat.core.communitychat.service;

import java.util.Map;

/**
 * Says, in words a reader understands, why the assistant could not answer.
 *
 * <p>Uses only the chat pipeline's stable error codes, never provider text,
 * so nothing from the AI Service or a model reaches the thread. Mirrors the
 * messages the web chat shows for the same codes ({@code chat-failures.ts}).
 * An unknown code is named as is: it is a safe identifier, and it is the one
 * thing that lets someone looking at the thread tell two failures apart.
 */
final class AiMentionFailures {

    private static final Map<String, String> REASONS = Map.ofEntries(
            Map.entry("AI_MAINTENANCE", "dịch vụ AI đang bảo trì."),
            Map.entry("CAPACITY_UNAVAILABLE", "hệ thống AI đang bận, chưa nhận thêm yêu cầu."),
            Map.entry("DEADLINE_EXCEEDED", "dịch vụ AI phản hồi quá chậm."),
            Map.entry("PROVIDER_TIMEOUT", "dịch vụ AI phản hồi quá chậm."),
            Map.entry("PROVIDER_HTTP_408", "dịch vụ AI phản hồi quá chậm."),
            Map.entry("PROVIDER_HTTP_429", "dịch vụ AI đang quá tải."),
            Map.entry("PROVIDER_HTTP_400", "yêu cầu không tương thích với model AI đang cấu hình."),
            Map.entry("PROVIDER_HTTP_401", "kết nối nhà cung cấp AI cần quản trị viên kiểm tra."),
            Map.entry("PROVIDER_HTTP_403", "kết nối nhà cung cấp AI cần quản trị viên kiểm tra."),
            Map.entry("PROVIDER_HTTP_405", "tài khoản nhà cung cấp AI không đủ credit hoặc đang tạm dừng."),
            Map.entry("PROVIDER_UNCONFIGURED", "nhà cung cấp AI chưa được cấu hình."),
            Map.entry("PROVIDER_UNAVAILABLE", "không kết nối được dịch vụ AI."),
            Map.entry("RETRIEVAL_UNAVAILABLE", "kho dữ liệu tài liệu tạm thời không khả dụng."),
            Map.entry("SOURCE_UNAVAILABLE", "quyền hoặc tài liệu của nhóm vừa thay đổi."),
            Map.entry("OPERATION_TERMINAL", "yêu cầu đã bị dừng giữa chừng."));

    private AiMentionFailures() {
    }

    /**
     * @param code the operation's error code, possibly null
     * @return a short reason, ending with a full stop
     */
    static String reasonFor(String code) {
        if (code == null || code.isBlank()) {
            return "dịch vụ AI chưa hoàn tất yêu cầu.";
        }
        return REASONS.getOrDefault(code, "dịch vụ AI chưa hoàn tất yêu cầu (mã " + code + ").");
    }
}
