package com.unichat.core.chat.service;

import java.util.UUID;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.TimeoutException;
import org.springframework.stereotype.Service;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationToken;
import com.unichat.core.chat.api.AskQuestionRequest;
import com.unichat.core.chat.api.ChatOperationResponse;
import com.unichat.core.chat.api.QuestionResponse;
import com.unichat.core.common.error.UnauthenticatedError;

/** Nonstream facade over the same durable operation used by SSE. */
@Service
public class ChatService {
    private final ChatOperationService operations;
    private final ChatOperationRunner runner;
    /** Uses shared reservation and inference rather than a second idempotency cache. */
    public ChatService(ChatOperationService operations,ChatOperationRunner runner) {
        this.operations=operations;this.runner=runner;
    }
    /** Starts a new operation, or returns current canonical status without another AI call. */
    public ChatOperationResponse ask(ChatActor actor,UUID workspaceId,AskQuestionRequest request,UUID key,String requestId) {
        var reservation=operations.reserve(actor,workspaceId,request,key,requestId);
        if (!reservation.created()) return operations.status(actor,workspaceId,reservation.operation().id());
        var future=runner.start(reservation.operation(),false,(event,payload) -> { });
        try { return future.get(25,TimeUnit.SECONDS); }
        catch (TimeoutException error) { return operations.status(actor,workspaceId,reservation.operation().id()); }
        catch (InterruptedException error) { Thread.currentThread().interrupt();throw new IllegalStateException("Chat request interrupted",error); }
        catch (java.util.concurrent.ExecutionException error) {
            if (error.getCause() instanceof RuntimeException expected) throw expected;
            throw new IllegalStateException("Chat execution failed",error.getCause());
        }
    }
    /** Existing in-process consumers still require a current authenticated user session. */
    public QuestionResponse askQuestion(UUID userId,UUID workspaceId,AskQuestionRequest request,String requestId) {
        if (!(SecurityContextHolder.getContext().getAuthentication() instanceof JwtAuthenticationToken token)) {
            throw new UnauthenticatedError("Phiên đăng nhập không hợp lệ.");
        }
        var actor=ChatActor.from(token.getToken());
        if (!actor.userId().equals(userId)) throw new UnauthenticatedError("Phiên đăng nhập không hợp lệ.");
        return ask(actor,workspaceId,request,UUID.randomUUID(),requestId).result();
    }
}
