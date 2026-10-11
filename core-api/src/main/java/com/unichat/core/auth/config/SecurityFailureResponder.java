package com.unichat.core.auth.config;

import java.io.IOException;
import java.time.Instant;
import java.util.LinkedHashMap;
import java.util.Map;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import com.fasterxml.jackson.databind.ObjectMapper;

/** RFC 7807 security-filter failures without exposing token or validation internals. */
public final class SecurityFailureResponder {
    private static final ObjectMapper MAPPER = new ObjectMapper();
    private SecurityFailureResponder() { }
    /** Writes the same public problem shape used by MVC boundary errors. */
    public static void write(HttpServletResponse response, HttpServletRequest request, int status,
            String code, String detail) throws IOException {
        Map<String, Object> problem = new LinkedHashMap<>();
        problem.put("type", "urn:unichat:problem:" + code.toLowerCase(java.util.Locale.ROOT));
        problem.put("title", status == 401 ? "Chưa xác thực tài khoản" : "Quyền truy cập bị từ chối");
        problem.put("status", status); problem.put("detail", detail);
        problem.put("instance", request.getRequestURI()); problem.put("code", code);
        Object requestId = request.getAttribute("requestId");
        problem.put("requestId", requestId == null ? "unknown" : requestId.toString());
        problem.put("timestamp", Instant.now().toString());
        response.setStatus(status); response.setContentType("application/problem+json");
        response.setCharacterEncoding("UTF-8");
        MAPPER.writeValue(response.getWriter(), problem);
    }
}
