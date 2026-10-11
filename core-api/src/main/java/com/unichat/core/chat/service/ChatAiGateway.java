package com.unichat.core.chat.service;

import java.util.Map;
import java.util.function.BiConsumer;
import com.unichat.core.chat.domain.ChatOperation;

/** Inference boundary shared by streaming/nonstreaming operations and fake providers. */
public interface ChatAiGateway {
    /** Calls the authorized AI service outside any persistence transaction. */
    Map<String,Object> answer(ChatOperation operation, Map<String,Object> request, boolean streaming,
            BiConsumer<String,Map<String,Object>> event);
}
