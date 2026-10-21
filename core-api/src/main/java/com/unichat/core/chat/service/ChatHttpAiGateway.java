package com.unichat.core.chat.service;

import java.io.BufferedReader;
import java.io.InputStream;
import java.io.InputStreamReader;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.net.http.HttpTimeoutException;
import java.nio.charset.StandardCharsets;
import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.util.Map;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.ExecutionException;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.TimeoutException;
import java.util.function.BiConsumer;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;
import com.unichat.core.chat.domain.ChatOperation;
import com.unichat.core.shared.config.ServiceTokenIssuer;

/** Transmits exactly the signed bytes and requires a private result before stream EOF. */
@Component
public class ChatHttpAiGateway implements ChatAiGateway {
    private static final Logger LOGGER = LoggerFactory.getLogger(ChatHttpAiGateway.class);
    private HttpClient client;
    private final ChatJson json;
    private final ServiceTokenIssuer signer;
    private final String baseUrl;
    private final Clock clock;
    private final ExecutorService streams;
    /** Receives bounded stream workers and a separate service signing identity. */
    public ChatHttpAiGateway(ChatJson json,ServiceTokenIssuer signer,
            @Value("${unichat.ai-service.url:http://localhost:8001}") String baseUrl,Clock clock,
            @Qualifier("chatStreamExecutor") ExecutorService streams) {
        this.json=json;this.signer=signer;this.baseUrl=baseUrl;this.clock=clock;this.streams=streams;
    }
    @Override
    public Map<String,Object> answer(ChatOperation operation,Map<String,Object> body,boolean streaming,
            BiConsumer<String,Map<String,Object>> event) {
        String path="/internal/v1/retrieval/answers"+(streaming?"/stream":"");
        byte[] bytes=json.write(body).getBytes(StandardCharsets.UTF_8);
        var request=HttpRequest.newBuilder(URI.create(baseUrl+path))
                .version(HttpClient.Version.HTTP_1_1)
                .timeout(Duration.ofMillis(remaining(operation)))
                .header("Content-Type","application/json").header("X-Request-Id",operation.requestId())
                .header("Idempotency-Key",operation.key().toString()).header("Authorization",
                        signer.issueToken("POST",path,"",bytes,operation.requestId(),operation.key().toString()))
                .POST(HttpRequest.BodyPublishers.ofByteArray(bytes)).build();
        try { return streaming?stream(request,operation,event):nonstream(request,operation); }
        catch (InterruptedException error) { Thread.currentThread().interrupt(); throw failure("PROVIDER_INTERRUPTED"); }
        catch (ChatOperationError error) { throw error; }
        catch (TimeoutException error) { LOGGER.warn("gateway_timeout operationId={}", operation.id(), error); throw failure("DEADLINE_EXCEEDED"); }
        catch (ExecutionException error) {
            LOGGER.warn("gateway_execution_error operationId={}", operation.id(), error);
            if (error.getCause() instanceof HttpTimeoutException) throw failure("DEADLINE_EXCEEDED");
            throw failure("PROVIDER_UNAVAILABLE");
        }
        catch (Exception error) {
            LOGGER.warn("gateway_unexpected_error operationId={}", operation.id(), error);
            throw failure("PROVIDER_UNAVAILABLE");
        }
    }
    private Map<String,Object> nonstream(HttpRequest request,ChatOperation operation) throws Exception {
        var response=client().sendAsync(request,HttpResponse.BodyHandlers.ofString(StandardCharsets.UTF_8))
                .get(remaining(operation),TimeUnit.MILLISECONDS);
        requireSuccess(response.statusCode(),response.body());
        return object(response.body());
    }
    private Map<String,Object> stream(HttpRequest request,ChatOperation operation,
            BiConsumer<String,Map<String,Object>> event) throws Exception {
        var response=client().sendAsync(request,HttpResponse.BodyHandlers.ofInputStream()).get(remaining(operation),TimeUnit.MILLISECONDS);
        try (InputStream body=response.body()) {
            var reader=streams.submit(() -> readResponse(response.statusCode(),body,event));
            try { return reader.get(remaining(operation),TimeUnit.MILLISECONDS); }
            catch (ExecutionException error) {
                if (error.getCause() instanceof ChatOperationError failure) throw failure;
                throw error;
            }
            finally { reader.cancel(true); }
        }
    }
    private Map<String,Object> readResponse(int status,InputStream body,
            BiConsumer<String,Map<String,Object>> event) throws java.io.IOException {
        if (status<200 || status>=300)
            requireSuccess(status,new String(body.readNBytes(8192),StandardCharsets.UTF_8));
        return readEvents(body,event);
    }
    private Map<String,Object> readEvents(InputStream stream,BiConsumer<String,Map<String,Object>> output) throws java.io.IOException {
        var reader=new BufferedReader(new InputStreamReader(stream,StandardCharsets.UTF_8));
        String event="message";
        StringBuilder data=new StringBuilder();
        String line;
        while ((line=reader.readLine())!=null) {
            if (line.length()>131072 || data.length()>262144) throw failure("STREAM_FRAME_TOO_LARGE");
            if (line.isEmpty() && !data.isEmpty()) {
                Map<String,Object> payload=object(data.toString());
                if ("result".equals(event)) return payload;
                if ("error".equals(event)) throw failure(ChatProviderFailures.code(payload));
                if (java.util.Set.of("token","reset","pipeline-step").contains(event)) output.accept(event,payload);
                event="message"; data.setLength(0);
            } else if (line.startsWith("event:")) event=line.substring(6).strip();
            else if (line.startsWith("data:")) { if (!data.isEmpty()) data.append('\n'); data.append(line.substring(5).stripLeading()); }
        }
        throw failure("STREAM_INTERRUPTED");
    }
    @SuppressWarnings("unchecked")
    private Map<String,Object> object(String value) { return json.read(value,Map.class); }
    private long remaining(ChatOperation operation) {
        long milliseconds=Duration.between(Instant.now(clock),operation.deadlineAt()).toMillis();
        if (milliseconds<=0) throw failure("DEADLINE_EXCEEDED");
        return milliseconds;
    }
    private void requireSuccess(int status,String body) {
        if (status>=200 && status<300) return;
        LOGGER.warn("gateway_http_failure status={} body={}", status, body);
        String code="PROVIDER_UNAVAILABLE";
        if (status==503 && body.length()<=8192) {
            try { code=ChatProviderFailures.code(object(body)); }
            catch (RuntimeException error) { throw failure("PROVIDER_UNAVAILABLE"); }
        }
        throw failure(code);
    }
    private synchronized HttpClient client() {
        if (client==null) client=HttpClient.newBuilder()
                .version(HttpClient.Version.HTTP_1_1)
                .connectTimeout(Duration.ofSeconds(5))
                .build();
        return client;
    }
    private ChatOperationError failure(String code) { return new ChatOperationError(code,HttpStatus.SERVICE_UNAVAILABLE,"Dịch vụ AI chưa hoàn tất yêu cầu. Vui lòng kiểm tra trạng thái."); }
}
