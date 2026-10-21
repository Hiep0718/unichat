package com.unichat.core.chat.service;

import java.time.Clock;
import java.io.ByteArrayInputStream;
import java.io.IOException;
import java.io.InputStream;
import java.net.http.HttpClient;
import java.net.http.HttpResponse;
import java.net.http.HttpTimeoutException;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.time.ZoneOffset;
import java.util.List;
import java.util.Map;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.TimeUnit;
import org.junit.jupiter.api.Test;
import org.springframework.test.util.ReflectionTestUtils;
import com.unichat.core.shared.config.ServiceTokenIssuer;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;
import static org.mockito.ArgumentMatchers.*;
import tools.jackson.databind.ObjectMapper;

class ChatHttpAiGatewayTest {
    @Test
    void shouldInitializeWithoutOpeningAiHttpTransport() {
        ChatHttpAiGateway gateway = new ChatHttpAiGateway(mock(ChatJson.class),
                mock(ServiceTokenIssuer.class), "http://localhost:8001", Clock.systemUTC(),
                mock(ExecutorService.class));

        assertNull(ReflectionTestUtils.getField(gateway, "client"));
    }
    @Test void shouldPreserveAllowlistedPrivateHttpFailureWithoutLeakingBody() throws Exception {
        var executor = Executors.newSingleThreadExecutor();
        try {
            var gateway = gateway(executor, 503, "{\"errorCode\":\"PROVIDER_HTTP_429\",\"message\":\"private-secret\"}");
            var failure = assertThrows(ChatOperationError.class,
                    () -> gateway.answer(ChatFixture.operation(true), Map.of(), false, (event, payload) -> { }));
            assertEquals("PROVIDER_HTTP_429", failure.getCode()); assertFalse(failure.getMessage().contains("private-secret"));
        } finally { executor.shutdownNow(); }
    }
    @Test void shouldPreservePrivateSseFailureAcrossReaderFutureAndNeverReturnResult() throws Exception {
        var executor = Executors.newSingleThreadExecutor(); var events = new java.util.ArrayList<String>();
        try {
            String stream = "event: reset\ndata: {}\n\nevent: error\ndata: {\"code\":\"PROVIDER_TIMEOUT\"}\n\n";
            var gateway = gateway(executor, 200, new ByteArrayInputStream(stream.getBytes(StandardCharsets.UTF_8)));
            var failure = assertThrows(ChatOperationError.class, () -> gateway.answer(ChatFixture.operation(true),
                    Map.of(), true, (event, payload) -> events.add(event)));
            assertEquals("PROVIDER_TIMEOUT", failure.getCode()); assertEquals(List.of("reset"), events);
        } finally { executor.shutdownNow(); }
    }
    @Test void shouldSanitizeUnknownPrivateSseCode() throws Exception {
        var executor = Executors.newSingleThreadExecutor();
        try {
            String stream = "event: error\ndata: {\"code\":\"private-secret\"}\n\n";
            var gateway = gateway(executor, 200, new ByteArrayInputStream(stream.getBytes(StandardCharsets.UTF_8)));
            assertEquals("PROVIDER_UNAVAILABLE", assertThrows(ChatOperationError.class,
                    () -> gateway.answer(ChatFixture.operation(true), Map.of(), true, (event, payload) -> { })).getCode());
        } finally { executor.shutdownNow(); }
    }
    @Test void shouldBoundStalledHttpErrorBodyByDeadlineAndCloseStream() throws Exception {
        var executor = Executors.newSingleThreadExecutor();
        var body = new StalledInputStream();
        try {
            var clock = Clock.fixed(ChatFixture.operation(true).deadlineAt().minusMillis(200), ZoneOffset.UTC);
            var gateway = gateway(executor, 503, body, clock);

            var failure = assertTimeoutPreemptively(Duration.ofSeconds(2), () -> assertThrows(ChatOperationError.class,
                    () -> gateway.answer(ChatFixture.operation(true), Map.of(), true, (event, payload) -> { })));

            assertEquals("DEADLINE_EXCEEDED", failure.getCode());
            assertTrue(body.readStarted.await(1, TimeUnit.SECONDS));
            assertEquals(0, body.closed.getCount());
        } finally { body.close(); executor.shutdownNow(); }
    }
    @Test void shouldPreserveSafeMethodFailureWithoutLeakingPrivateHttpBody() throws Exception {
        var executor = Executors.newSingleThreadExecutor();
        try {
            String body = "{\"errorCode\":\"PROVIDER_HTTP_405\",\"message\":\"private-secret\"}";
            var gateway = gateway(executor, 503, new ByteArrayInputStream(body.getBytes(StandardCharsets.UTF_8)));

            var failure = assertThrows(ChatOperationError.class,
                    () -> gateway.answer(ChatFixture.operation(true), Map.of(), true, (event, payload) -> { }));

            assertEquals("PROVIDER_HTTP_405", failure.getCode());
            assertFalse(failure.getMessage().contains("private-secret"));
        } finally { executor.shutdownNow(); }
    }
    @Test void shouldSanitizeUnexpectedPrivateHttpMethodResponse() throws Exception {
        var executor = Executors.newSingleThreadExecutor();
        try {
            var gateway = gateway(executor, 405, new ByteArrayInputStream("private-secret".getBytes(StandardCharsets.UTF_8)));

            var failure = assertThrows(ChatOperationError.class,
                    () -> gateway.answer(ChatFixture.operation(true), Map.of(), true, (event, payload) -> { }));

            assertEquals("PROVIDER_UNAVAILABLE", failure.getCode());
            assertFalse(failure.getMessage().contains("private-secret"));
        } finally { executor.shutdownNow(); }
    }
    @Test void shouldMapHttpRequestTimeoutToDeadlineFailure() throws Exception {
        var executor = Executors.newSingleThreadExecutor();
        try {
            var gateway = gateway(executor, 200, "unused");
            var transport = (HttpClient) ReflectionTestUtils.getField(gateway, "client");
            doReturn(CompletableFuture.failedFuture(new HttpTimeoutException("private-secret")))
                    .when(transport).sendAsync(any(), any(HttpResponse.BodyHandler.class));

            var failure = assertThrows(ChatOperationError.class,
                    () -> gateway.answer(ChatFixture.operation(true), Map.of(), true, (event, payload) -> { }));

            assertEquals("DEADLINE_EXCEEDED", failure.getCode());
            assertFalse(failure.getMessage().contains("private-secret"));
        } finally { executor.shutdownNow(); }
    }
    private ChatHttpAiGateway gateway(ExecutorService executor, int status, Object body) throws Exception {
        return gateway(executor, status, body, ChatFixture.CLOCK);
    }
    @SuppressWarnings({"rawtypes", "unchecked"})
    private ChatHttpAiGateway gateway(ExecutorService executor, int status, Object body, Clock clock) throws Exception {
        var signer = mock(ServiceTokenIssuer.class); when(signer.issueToken(any(),any(),any(),any(),any(),any())).thenReturn("signed-fixture");
        var gateway = new ChatHttpAiGateway(new ChatJson(new ObjectMapper()), signer, "http://fixture.invalid",
                clock, executor);
        var transport = mock(HttpClient.class); HttpResponse response = mock(HttpResponse.class);
        when(response.statusCode()).thenReturn(status); when(response.body()).thenReturn(body);
        doReturn(CompletableFuture.completedFuture(response)).when(transport).sendAsync(any(), any(HttpResponse.BodyHandler.class));
        ReflectionTestUtils.setField(gateway, "client", transport);
        return gateway;
    }
    private static final class StalledInputStream extends InputStream {
        private final CountDownLatch readStarted = new CountDownLatch(1);
        private final CountDownLatch closed = new CountDownLatch(1);
        @Override public int read() throws IOException {
            readStarted.countDown();
            try { closed.await(); return -1; }
            catch (InterruptedException error) { Thread.currentThread().interrupt(); throw new IOException(error); }
        }
        @Override public void close() { closed.countDown(); }
    }
}
