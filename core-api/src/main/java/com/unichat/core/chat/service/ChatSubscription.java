package com.unichat.core.chat.service;

import java.io.IOException;
import java.util.Map;
import java.util.concurrent.ArrayBlockingQueue;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicBoolean;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;
import com.unichat.core.chat.domain.ChatOperation;

/** A bounded subscriber; disconnect/slow output never cancels the durable operation. */
public final class ChatSubscription {
    private record Event(String name,Object data) { }
    private final ArrayBlockingQueue<Event> queue=new ArrayBlockingQueue<>(32);
    private final AtomicBoolean closed=new AtomicBoolean();
    private final SseEmitter emitter=new SseEmitter(125000L);
    private final ChatOperation operation;
    private final ChatOutputGuard guard;
    private final boolean contentFreeReplay;
    /** Registers detach callbacks before inference starts and a bounded sender task. */
    public ChatSubscription(ChatOperation operation,ChatOutputGuard guard,ExecutorService executor) {
        this(operation,guard,executor,false);
    }
    /** Uses identity-only delivery exclusively for a server-generated source-unavailable refusal. */
    public ChatSubscription(ChatOperation operation,ChatOutputGuard guard,ExecutorService executor,boolean contentFreeReplay) {
        this.operation=operation;this.guard=guard;
        this.contentFreeReplay=contentFreeReplay;
        emitter.onCompletion(this::detach);emitter.onTimeout(this::detach);emitter.onError(error -> detach());
        executor.execute(this::sendLoop);
    }
    /** Returns the public subscription transport. */
    public SseEmitter emitter() { return emitter; }
    /** Enqueues a bounded output batch, detaching a slow subscriber without blocking inference. */
    public void offer(String name,Object data) {
        if (!closed.get() && !queue.offer(new Event(name,data))) { detach();emitter.complete(); }
    }
    private void sendLoop() {
        try {
            while (!closed.get()) {
                Event event=queue.poll(10,TimeUnit.SECONDS);
                if (contentFreeReplay) guard.checkIdentity(operation); else guard.check(operation);
                if (event==null) { emitter.send(SseEmitter.event().comment("heartbeat"));continue; }
                emitter.send(SseEmitter.event().name(event.name()).data(event.data()));
                if ("done".equals(event.name()) || "error".equals(event.name())) { emitter.complete();return; }
            }
        } catch (InterruptedException error) { Thread.currentThread().interrupt();emitter.completeWithError(error); }
        catch (IOException error) { emitter.completeWithError(error); }
        catch (RuntimeException error) { authorizationFailure(); }
        finally { detach(); }
    }
    private void authorizationFailure() {
        try { emitter.send(SseEmitter.event().name("error").data(Map.of("code","SOURCE_UNAVAILABLE","operationId",operation.id()))); }
        catch (IOException error) { emitter.completeWithError(error);return; }
        emitter.complete();
    }
    private void detach() { closed.set(true);queue.clear(); }
}
