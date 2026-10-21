package com.unichat.core.admin.service;

import java.util.UUID;
import org.springframework.dao.DataAccessException;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import com.unichat.core.admin.api.AiAdmissionRequest;
import com.unichat.core.admin.api.AiAdmissionResponse;
import com.unichat.core.chat.service.ChatOperationError;

/** Database-backed admission; existing operations retain their source/session checks. */
@Service
public class AiAdmissionService {
    private final AiAdmissionRepository repository;
    private final AuditService audit;
    /** Composes locking and durable administrative audit without network transactions. */
    public AiAdmissionService(AiAdmissionRepository repository, AuditService audit) {
        this.repository = repository; this.audit = audit;
    }
    /** Holds a shared lock in the caller's reservation/START transaction; fails closed. */
    public AiAdmissionResponse lockShared() { return lock(false); }
    private AiAdmissionResponse lock(boolean exclusive) {
        try {
            AiAdmissionResponse control = repository.lock(exclusive);
            if (control == null) throw new AiMaintenanceError();
            return control;
        } catch (DataAccessException error) { throw new AiMaintenanceError(); }
    }
    /** Rejects new chat reservations before messages and quota consumption. */
    public void requireChat(AiAdmissionResponse control) {
        if (!"OPEN".equals(control.state())) throw new AiMaintenanceError();
    }
    /** Allows diagnostics during verification; durable START repeats this check atomically. */
    public void requireDiagnostic(AiAdmissionResponse control) {
        if (!java.util.Set.of("OPEN", "VERIFYING").contains(control.state())) throw new AiMaintenanceError();
    }
    /** Returns authoritative current state and conservative outstanding counts. */
    @Transactional
    public AiAdmissionResponse status() { return counts(lockShared()); }
    /** Performs an early diagnostic check without holding a lock across provider I/O. */
    @Transactional
    public void checkDiagnostic() { requireDiagnostic(lockShared()); }
    /** Applies a version-checked state change with an audit in the same transaction. */
    @Transactional
    public AiAdmissionResponse update(UUID actorId, AiAdmissionRequest request) {
        AiAdmissionResponse current = counts(lock(true));
        if (current.version() != request.expectedVersion()) throw conflict("ADMISSION_VERSION_CONFLICT");
        if (current.state().equals(request.state())) return current;
        validateTransition(current, request.state());
        repository.update(request.state(), actorId);
        audit.record(actorId, "AI_ADMISSION_" + request.state(), "AI_GENERATION_CONTROL", null, "SUCCESS");
        return new AiAdmissionResponse(request.state(), current.version() + 1,
                current.runningOperationCount(), current.pendingAttemptCount());
    }
    private AiAdmissionResponse counts(AiAdmissionResponse control) {
        try {
            AiAdmissionResponse result = repository.counts(control);
            if (result == null) throw new AiMaintenanceError();
            return result;
        } catch (DataAccessException error) { throw new AiMaintenanceError(); }
    }
    private void validateTransition(AiAdmissionResponse current, String target) {
        if (!"VERIFYING".equals(target)) return;
        if (!"DRAINING".equals(current.state())) throw conflict("ADMISSION_TRANSITION_INVALID");
        if (current.runningOperationCount() != 0 || current.pendingAttemptCount() != 0)
            throw conflict("ADMISSION_NOT_DRAINED");
    }
    private ChatOperationError conflict(String code) {
        return new ChatOperationError(code, HttpStatus.CONFLICT, "Trạng thái AI đã thay đổi hoặc còn yêu cầu đang xử lý.");
    }
}
