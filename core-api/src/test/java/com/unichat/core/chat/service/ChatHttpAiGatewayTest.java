package com.unichat.core.chat.service;

import java.time.Clock;
import java.util.concurrent.ExecutorService;
import org.junit.jupiter.api.Test;
import org.springframework.test.util.ReflectionTestUtils;
import com.unichat.core.shared.config.ServiceTokenIssuer;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.mockito.Mockito.mock;

class ChatHttpAiGatewayTest {
    @Test
    void shouldInitializeWithoutOpeningAiHttpTransport() {
        ChatHttpAiGateway gateway = new ChatHttpAiGateway(mock(ChatJson.class),
                mock(ServiceTokenIssuer.class), "http://localhost:8001", Clock.systemUTC(),
                mock(ExecutorService.class));

        assertNull(ReflectionTestUtils.getField(gateway, "client"));
    }
}
