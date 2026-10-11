package com.unichat.core.chat.service;

import tools.jackson.databind.ObjectMapper;
import org.springframework.stereotype.Component;

/** Serializes persisted chat contracts through one configured mapper. */
@Component
public class ChatJson {
    private final ObjectMapper mapper;
    /** Receives the application's JSON configuration. */
    public ChatJson(ObjectMapper mapper) { this.mapper = mapper; }
    /** Encodes a canonical binding or result without swallowing serialization failures. */
    public String write(Object value) {
        try { return mapper.writeValueAsString(value); }
        catch (Exception error) { throw new IllegalStateException("Chat serialization failed", error); }
    }
    /** Decodes trusted persisted structure; malformed legacy structure fails closed. */
    public <T> T read(String value, Class<T> type) {
        try { return mapper.readValue(value, type); }
        catch (Exception error) { throw new IllegalStateException("Chat data invalid", error); }
    }
}
