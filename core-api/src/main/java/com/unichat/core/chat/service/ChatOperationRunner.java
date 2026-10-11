package com.unichat.core.chat.service;

import java.util.HashMap;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.ScheduledExecutorService;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.CompletableFuture;
import java.util.function.BiConsumer;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.slf4j.MDC;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.stereotype.Service;
import com.unichat.core.chat.api.ChatOperationResponse;
import com.unichat.core.chat.api.QuestionResponse;
import com.unichat.core.chat.domain.ChatOperation;
import com.unichat.core.common.error.AppError;

/** Executes inference outside transactions and publishes terminal content only after durable commit. */
@Service
public class ChatOperationRunner {
    private static final Logger LOGGER=LoggerFactory.getLogger(ChatOperationRunner.class);
    private final ChatOperationService operations;
    private final ChatMessageStore messages;
    private final ChatAiGateway gateway;
    private final ChatResultMapper results;
    private final ExecutorService executor;
    private final ScheduledExecutorService heartbeats;
    /** Separates provider work from persistence and public subscription delivery. */
    public ChatOperationRunner(ChatOperationService operations,ChatMessageStore messages,ChatAiGateway gateway,
            ChatResultMapper results,@Qualifier("chatOperationExecutor") ExecutorService executor,
            @Qualifier("chatHeartbeatExecutor") ScheduledExecutorService heartbeats) {
        this.operations=operations;this.messages=messages;this.gateway=gateway;this.results=results;
        this.executor=executor;this.heartbeats=heartbeats;
    }
    /** Schedules exactly the newly reserved operation; durable retries never enter here. */
    public CompletableFuture<ChatOperationResponse> start(ChatOperation operation,boolean streaming,
            BiConsumer<String,Object> output) {
        try { return CompletableFuture.supplyAsync(() -> run(operation,streaming,output),executor); }
        catch (RuntimeException error) { operations.fail(operation,"CAPACITY_UNAVAILABLE");throw error; }
    }
    private ChatOperationResponse run(ChatOperation operation,boolean streaming,BiConsumer<String,Object> output) {
        try (var request=MDC.putCloseable("requestId",operation.requestId())) {
            output.accept("metadata",Map.of("operationId",operation.id(),"conversationId",operation.conversationId(),
                    "requestId",operation.requestId(),"knowledgeMode",operation.expanded()?"EXPANDED":"STRICT","provisional",true));
            return infer(operation,streaming,output);
        } catch (RuntimeException error) {
            String code=error instanceof AppError expected?expected.getCode():"CHAT_FAILED";
            operations.fail(operation,code);
            output.accept("error",Map.of("code",code,"operationId",operation.id(),"requestId",operation.requestId()));
            LOGGER.warn("chat_operation_failed operationId={} requestId={} code={}",operation.id(),operation.requestId(),code);
            return operations.status(operation.actor(),operation.workspaceId(),operation.id());
        }
    }
    private ChatOperationResponse infer(ChatOperation operation,boolean streaming,BiConsumer<String,Object> output) {
        UUID messageId=UUID.randomUUID();
        if (!operation.sources().cloudAllowed()) return finish(operation,results.refusal(operation,messageId,"CLOUD_NOT_ALLOWED",
                "Workspace chưa cho phép xử lý bằng AI."),null,null,0,output);
        if (!operation.sources().validMetadata()) return finish(operation,results.refusal(operation,messageId,"SOURCE_METADATA_INVALID",
                "Nguồn chưa có thông tin phiên bản đủ để xác minh."),null,null,0,output);
        if (operation.sources().sources().isEmpty()) return finish(operation,results.refusal(operation,messageId,"NO_DOCUMENTS",
                "Chưa có tài liệu được phép dùng để trả lời."),null,null,0,output);
        operations.checkpoint(operation.id());
        int summaryVersion=messages.summaryVersion(operation.conversationId());
        var heartbeat=heartbeats.scheduleAtFixedRate(() -> heartbeat(operation),10,10,TimeUnit.SECONDS);
        try {
            var raw=gateway.answer(operation,request(operation),streaming,(event,payload) -> {
                operations.checkpoint(operation.id());
                if ("token".equals(event)) operations.firstToken(operation.id());
                output.accept(event,"pipeline-step".equals(event)?ChatPublicProgress.from(payload):payload);
            });
            operations.checkpoint(operation.id());
            QuestionResponse result=results.convert(operation,raw,messageId);
            String provider=raw.get("provider") instanceof String value?value:null;
            String summary=raw.get("compactedSummary") instanceof String value?value:null;
            return finish(operation,result,provider,summary,summaryVersion,output);
        } finally { heartbeat.cancel(false); }
    }
    private Map<String,Object> request(ChatOperation operation) {
        var body=new HashMap<String,Object>();
        body.put("operationId",operation.id());body.put("workspaceId",operation.workspaceId());
        body.put("question",operation.question());body.put("requestId",operation.requestId());body.put("strategyVersion","v1.0");
        body.put("allowExternalKnowledge",operation.expanded());body.put("cloudAllowed",operation.sources().cloudAllowed());
        body.put("permissionVersion",operation.sources().permissionVersion());body.put("sources",operation.sources().sources());
        body.put("allowedDocumentIds",operation.sources().sources().stream().map(source -> source.documentId().toString()).toList());
        body.put("conversationHistory",messages.history(operation.conversationId(),operation.sources(),operation.userMessageId()));
        String summary=messages.summary(operation.conversationId(),operation.sources());
        if (summary!=null) { body.put("conversationSummary",summary);body.put("summarySources",operation.sources().sources()); }
        return body;
    }
    private ChatOperationResponse finish(ChatOperation operation,QuestionResponse result,String provider,String summary,
            int summaryVersion,BiConsumer<String,Object> output) {
        output.accept("pipeline-step",ChatPublicProgress.from(Map.of("stepKey","PERSISTENCE")));
        ChatOperationResponse status=operations.complete(operation,result,provider,summary,summaryVersion);
        if ("COMPLETED".equals(status.state())) {
            output.accept("final",status.result());output.accept("done",Map.of("state","COMPLETED","operationId",operation.id(),
                    "messageId",status.result().messageId(),"conversationId",operation.conversationId()));
        } else output.accept("error",Map.of("code",status.errorCode()==null?status.state():status.errorCode(),"operationId",operation.id()));
        return status;
    }
    private void heartbeat(ChatOperation operation) {
        try { operations.checkpoint(operation.id()); }
        catch (RuntimeException error) {
            String code=error instanceof AppError expected?expected.getCode():"CHECKPOINT_FAILED";
            operations.fail(operation,code);
        }
    }
}
