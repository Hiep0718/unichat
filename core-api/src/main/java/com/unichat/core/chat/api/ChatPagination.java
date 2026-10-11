package com.unichat.core.chat.api;

import java.util.Map;
import java.util.Set;
import org.springframework.data.domain.PageRequest;

/** Strict page/size validation; ignored legacy cursor/limit parameters are rejected. */
public final class ChatPagination {
    private ChatPagination() { }
    /** Rejects unsupported parameters, negative pages and sizes above the public cap. */
    public static PageRequest parse(Map<String,String> query,boolean messages) {
        Set<String> allowed=messages?Set.of("page","size","snapshotSequence"):Set.of("page","size");
        if (!allowed.containsAll(query.keySet())) throw new ChatQueryError("Tham số phân trang không được hỗ trợ.");
        int page=integer(query.getOrDefault("page","0"));
        int size=integer(query.getOrDefault("size","20"));
        if (page<0 || size<1 || size>100) throw new ChatQueryError("page phải từ 0; size phải từ 1 đến 100.");
        return PageRequest.of(page,size);
    }
    /** Returns a validated stable message sequence anchor, if supplied. */
    public static Long snapshot(Map<String,String> query) {
        if (!query.containsKey("snapshotSequence")) return null;
        try {
            long sequence=Long.parseLong(query.get("snapshotSequence"));
            if (sequence<0) throw new NumberFormatException();
            return sequence;
        } catch (NumberFormatException error) { throw new ChatQueryError("snapshotSequence không hợp lệ."); }
    }
    private static int integer(String value) {
        try { return Integer.parseInt(value); }
        catch (NumberFormatException error) { throw new ChatQueryError("Tham số phân trang phải là số nguyên."); }
    }
}
