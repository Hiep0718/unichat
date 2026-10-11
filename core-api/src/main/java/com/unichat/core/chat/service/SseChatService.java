package com.unichat.core.chat.service;

import java.util.Map;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.stereotype.Service;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;
import java.util.concurrent.ExecutorService;

/** Connects a bounded public subscription to an independently running operation. */
@Service
public class SseChatService {
    private final ChatOperationRunner runner;
    private final ChatOperationService operations;
    private final ChatOutputGuard guard;
    private final ExecutorService streams;
    /** Separates subscription lifetime from the durable operation lifetime. */
    public SseChatService(ChatOperationRunner runner,ChatOperationService operations,ChatOutputGuard guard,
            @Qualifier("chatStreamExecutor") ExecutorService streams) {
        this.runner=runner;this.operations=operations;this.guard=guard;this.streams=streams;
    }
    /** Publishes a new operation or replays already committed canonical content. */
    public SseEmitter stream(ChatOperationService.Reservation reservation) {
        var operation=reservation.operation();
        var status=reservation.created()?null:operations.status(operation.actor(),operation.workspaceId(),operation.id());
        boolean contentFree=status!=null && status.result()!=null && "REFUSE".equals(status.result().decision())
                && "SOURCE_UNAVAILABLE".equals(status.result().refusalCode())
                && status.result().citations().isEmpty() && status.result().sections().isEmpty();
        var subscription=new ChatSubscription(operation,guard,streams,contentFree);
        if (reservation.created()) runner.start(operation,true,subscription::offer);
        else {
            subscription.offer("metadata",Map.of("operationId",operation.id(),"conversationId",operation.conversationId(),
                    "requestId",operation.requestId(),"knowledgeMode",operation.expanded()?"EXPANDED":"STRICT","provisional",false));
            if ("COMPLETED".equals(status.state())) {
                subscription.offer("final",status.result());
                subscription.offer("done",Map.of("operationId",operation.id(),"state","COMPLETED",
                        "messageId",status.result().messageId(),"conversationId",operation.conversationId()));
            } else subscription.offer("error",Map.of("operationId",operation.id(),"code",status.errorCode()==null?status.state():status.errorCode()));
        }
        return subscription.emitter();
    }
}
