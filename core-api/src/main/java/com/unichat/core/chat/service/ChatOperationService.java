package com.unichat.core.chat.service;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.util.Objects;
import java.util.Optional;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;
import com.unichat.core.admin.service.AuditService;
import com.unichat.core.admin.service.AiAdmissionService;
import com.unichat.core.chat.api.AskQuestionRequest;
import com.unichat.core.chat.api.ChatOperationResponse;
import com.unichat.core.chat.api.ChatOperationProgress;
import com.unichat.core.chat.api.QuestionResponse;
import com.unichat.core.chat.domain.ChatOperation;
import com.unichat.core.chat.domain.ChatOperationRepository;
import com.unichat.core.common.error.NotFoundError;
import com.unichat.core.shared.ratelimit.RateLimitService;

/** Owns short reservation/final transactions; inference never holds a DB transaction. */
@Service
public class ChatOperationService {
    private final ChatOperationRepository operations;
    private final ChatConversationStore conversations;
    private final ChatMessageStore messages;
    private final ChatAccessService access;
    private final ChatJson json;
    private final RateLimitService rates;
    private final AuditService audit;
    private final Clock clock;
    private final TransactionTemplate transaction;
    private final AiAdmissionService admission;
    private final WorkspaceSummaryJobService summaryJobs;
    @Value("${unichat.workspace-summary.enabled:false}")
    private boolean workspaceSummaryEnabled;
    /** Coordinates durable operation state and current authorization. */
    public ChatOperationService(ChatOperationRepository operations, ChatConversationStore conversations,
            ChatMessageStore messages, ChatAccessService access, ChatJson json, RateLimitService rates,
            AuditService audit, Clock clock, PlatformTransactionManager manager, AiAdmissionService admission,
            WorkspaceSummaryJobService summaryJobs) {
        this.operations=operations; this.conversations=conversations; this.messages=messages; this.access=access;
        this.json=json; this.rates=rates; this.audit=audit; this.clock=clock; this.transaction=new TransactionTemplate(manager);
        this.admission=admission;
        this.summaryJobs=summaryJobs;
    }
    /** Indicates whether this caller reserved a new operation or found an existing binding. */
    public record Reservation(ChatOperation operation, boolean created) { }
    /**
     * Reserves one turn; same-key retries are never charged again or sent to the provider.
     * A turn without an explicit task type is routed by {@link ChatTaskRouter} from the question intent.
     */
    public Reservation reserve(ChatActor actor, UUID workspaceId, AskQuestionRequest request, UUID key, String requestId) {
        ChatBinding binding=ChatTaskRouter.route(workspaceId,request,workspaceSummaryEnabled);
        return Objects.requireNonNull(transaction.execute(status -> reserveLocked(actor,binding,key,requestId)));
    }
    private Reservation reserveLocked(ChatActor actor, ChatBinding binding, UUID key, String requestId) {
        Instant now=Instant.now(clock);
        var control=admission.lockShared();
        operations.lockActor(actor.userId());
        expire(actor.userId(),now);
        if (binding.taskType() == com.unichat.core.chat.api.ChatTaskType.WORKSPACE_SUMMARY
                && !workspaceSummaryEnabled) {
            throw new ChatOperationError("WORKSPACE_SUMMARY_DISABLED", HttpStatus.SERVICE_UNAVAILABLE,
                    "Tính năng tóm tắt Workspace hiện chưa được bật.");
        }
        ChatSourceSnapshot snapshot = binding.taskType() == com.unichat.core.chat.api.ChatTaskType.WORKSPACE_SUMMARY
                ? access.readWorkspaceSummary(actor, binding.workspaceId())
                : access.read(actor,binding.workspaceId());
        var existing=operations.findByKey(actor.userId(),key);
        if (existing.isPresent()) return replayBinding(existing.get(),binding,now);
        admission.requireChat(control);
        if (operations.running(actor.userId()) >= 2) throw conflict("CHAT_BUSY","Bạn đang có hai yêu cầu đang xử lý.");
        UUID conversationId=conversations.reserve(actor,binding,now);
        if (operations.busy(conversationId)) throw conflict("CONVERSATION_BUSY","Hội thoại đang xử lý một câu hỏi khác.");
        rates.consume(actor.userId().toString(),"chat.ask",20,Duration.ofMinutes(1));
        UUID userMessage=messages.user(conversationId,binding.question(),now);
        long runtimeSeconds = binding.taskType() == com.unichat.core.chat.api.ChatTaskType.WORKSPACE_SUMMARY
                ? Duration.ofHours(2).toSeconds() : 240;
        long initialLeaseSeconds = binding.taskType() == com.unichat.core.chat.api.ChatTaskType.WORKSPACE_SUMMARY
                ? 300 : 90;
        ChatOperation operation=new ChatOperation(UUID.randomUUID(),actor,key,binding.hash(json),binding.workspaceId(),
                binding.conversationId(),conversationId,userMessage,null,binding.question(),binding.expanded(),binding.taskType(),
                requestId,"RUNNING",snapshot,null,now.plusSeconds(runtimeSeconds),now.plusSeconds(initialLeaseSeconds),now.plus(Duration.ofHours(24)));
        operations.insert(operation,now);
        return new Reservation(operation,true);
    }
    private Reservation replayBinding(ChatOperation existing, ChatBinding binding, Instant now) {
        if (!existing.expiresAt().isAfter(now)) throw new ChatOperationError("IDEMPOTENCY_EXPIRED",HttpStatus.GONE,"Khóa yêu cầu đã hết hạn. Hãy tạo yêu cầu mới.");
        if (existing.taskType() != binding.taskType()) {
            throw conflict("IDEMPOTENCY_BINDING_MISMATCH", "Khóa yêu cầu đã được dùng cho loại tác vụ khác.");
        }
        if (!existing.bindingHash().equals(binding.hash(json))) throw conflict("IDEMPOTENCY_CONFLICT","Khóa yêu cầu đã được dùng với nội dung khác.");
        conversations.requireOwner(existing.actor().userId(),existing.workspaceId(),existing.conversationId(),false);
        return new Reservation(existing,false);
    }
    /** Finds a durable in-flight summary without storing operation IDs on a device. */
    public Optional<ChatOperationResponse> activeSummary(ChatActor actor, UUID workspaceId, UUID conversationId) {
        access.read(actor, workspaceId);
        return operations.findActiveSummary(actor.userId(), workspaceId, conversationId)
                .map(operation -> status(actor, workspaceId, operation.id()));
    }

    /** Reads owner-only current status and reconstructs authorized canonical results. */
    public ChatOperationResponse status(ChatActor actor, UUID workspaceId, UUID operationId) {
        return Objects.requireNonNull(transaction.execute(status -> {
            operations.lockActor(actor.userId());
            expire(actor.userId(),Instant.now(clock));
            ChatOperation operation=owned(actor,workspaceId,operationId);
            boolean summary = operation.taskType() == com.unichat.core.chat.api.ChatTaskType.WORKSPACE_SUMMARY;
            var current=summary && "COMPLETED".equals(operation.state())
                    ? access.readWorkspaceSummary(actor,workspaceId) : access.read(actor,workspaceId);
            if (summary && "COMPLETED".equals(operation.state())
                    && !current.fingerprint().equals(operation.sources().fingerprint())) {
                throw conflict("SUMMARY_SOURCE_SNAPSHOT_CHANGED", "Nguồn tài liệu của bản tóm tắt đã thay đổi.");
            }
            conversations.requireOwner(actor.userId(),workspaceId,operation.conversationId(),false);
            QuestionResponse result="COMPLETED".equals(operation.state()) && !summary ? messages.result(operation,current) : null;
            ChatOperationProgress progress = operation.taskType() == com.unichat.core.chat.api.ChatTaskType.WORKSPACE_SUMMARY
                    ? operations.summaryProgress(operation.id()).orElse(null) : null;
            return new ChatOperationResponse(operation.id(),operation.state(),operation.conversationId(),result,
                    operation.errorCode(), operation.taskType(), progress,
                    summary && "COMPLETED".equals(operation.state()) ? summaryJobs.result(operation.id()) : null);
        }));
    }
    /** Cancel is idempotent and never replaces a completed result. */
    public ChatOperationResponse cancel(ChatActor actor, UUID workspaceId, UUID operationId) {
        transaction.executeWithoutResult(status -> {
            operations.lockActor(actor.userId());
            ChatOperation operation=owned(actor,workspaceId,operationId);
            access.read(actor,workspaceId);
            conversations.requireOwner(actor.userId(),workspaceId,operation.conversationId(),true);
            operations.lock(operationId);
            if (operations.terminal(operationId,"CANCELLED",null,"CANCELLED",Instant.now(clock))) {
                audit.record(actor.userId(),"CHAT_CANCELLED","CHAT_OPERATION",operationId,"SUCCESS");
            }
        });
        return status(actor,workspaceId,operationId);
    }
    /** Rechecks current session, ownership, policy and source version before each AI attempt/output. */
    public ChatOperation checkpoint(UUID operationId) {
        return Objects.requireNonNull(transaction.execute(status -> {
            var operation=operations.findById(operationId).orElseThrow(() -> new NotFoundError("Yêu cầu không tồn tại."));
            Instant now=Instant.now(clock);
            if (!"RUNNING".equals(operation.state()) || !operation.deadlineAt().isAfter(now) || !operation.leaseUntil().isAfter(now)) {
                throw conflict("OPERATION_TERMINAL","Yêu cầu không còn chạy.");
            }
            var current=access.read(operation.actor(),operation.workspaceId());
            conversations.requireOwner(operation.actor().userId(),operation.workspaceId(),operation.conversationId(),false);
            if (!current.cloudAllowed() || !current.fingerprint().equals(operation.sources().fingerprint())) {
                throw conflict("SOURCE_UNAVAILABLE","Quyền hoặc phiên bản nguồn đã thay đổi.");
            }
            if (!operations.heartbeat(operationId,now)) throw conflict("OPERATION_TERMINAL","Yêu cầu đã kết thúc.");
            return operation;
        }));
    }
    /** Commits the complete assistant result, dependencies and success audit atomically. */
    public ChatOperationResponse complete(ChatOperation initial, QuestionResponse result, String provider,
            String summary, int summaryVersion) {
        transaction.executeWithoutResult(status -> {
            operations.lockActor(initial.actor().userId());
            conversations.requireOwner(initial.actor().userId(),initial.workspaceId(),initial.conversationId(),true);
            ChatOperation current=operations.lock(initial.id());
            if (!"RUNNING".equals(current.state())) return;
            if (!current.deadlineAt().isAfter(Instant.now(clock)) || !current.leaseUntil().isAfter(Instant.now(clock))) {
                throw conflict("DEADLINE_EXCEEDED","Yêu cầu đã hết thời gian xử lý.");
            }
            conversations.lockSources(initial.actor(),initial.workspaceId());
            ChatSourceSnapshot sources=access.read(initial.actor(),initial.workspaceId());
            if (!sources.fingerprint().equals(initial.sources().fingerprint())
                    || (initial.sources().cloudAllowed() && !sources.cloudAllowed())) {
                throw conflict("SOURCE_UNAVAILABLE","Quyền hoặc phiên bản nguồn đã thay đổi.");
            }
            messages.assistant(initial,result,provider,Instant.now(clock));
            messages.summary(initial.conversationId(),sources,summary,summaryVersion);
            operations.terminal(initial.id(),"COMPLETED",result.messageId(),null,Instant.now(clock));
            audit.record(initial.actor().userId(),"CHAT_COMPLETED","CHAT_OPERATION",initial.id(),"SUCCESS");
            audit.record(initial.actor().userId(),"CHAT_"+result.decision(),"CHAT_OPERATION",initial.id(),"SUCCESS");
        });
        return status(initial.actor(),initial.workspaceId(),initial.id());
    }
    /** Commits a safe terminal failure; a prior cancel/completion wins. */
    public void fail(ChatOperation initial, String code) {
        transaction.executeWithoutResult(status -> {
            operations.lockActor(initial.actor().userId());
            if (operations.terminal(initial.id(),"FAILED",null,code,Instant.now(clock))) {
                audit.record(initial.actor().userId(),"CHAT_FAILED","CHAT_OPERATION",initial.id(),"FAILURE");
            }
        });
    }
    /** Stores the first real provisional token time without counting retries as logical chats. */
    public void firstToken(UUID operationId) {
        transaction.executeWithoutResult(status -> operations.firstToken(operationId,Instant.now(clock)));
    }
    private ChatOperation owned(ChatActor actor, UUID workspaceId, UUID id) {
        return operations.findById(id).filter(value -> value.actor().userId().equals(actor.userId()) && value.workspaceId().equals(workspaceId))
                .orElseThrow(() -> new NotFoundError("Yêu cầu không tồn tại."));
    }
    /** Reaps a bounded batch with the same account-before-operation order used by mutations. */
    public void cleanupLeases() {
        Instant now=Instant.now(clock);
        operations.expiredActors(now).forEach(actorId -> transaction.executeWithoutResult(status -> {
            operations.lockActor(actorId);
            expire(actorId,now);
        }));
    }
    private void expire(UUID actorId, Instant now) {
        operations.expire(actorId,now).forEach(operation -> audit.record(operation.actor().userId(),
                "CHAT_FAILED","CHAT_OPERATION",operation.id(),"FAILURE"));
    }
    private ChatOperationError conflict(String code,String detail) { return new ChatOperationError(code,HttpStatus.CONFLICT,detail); }
}
