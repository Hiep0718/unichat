package com.unichat.core.admin.service;

import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.springframework.dao.DataAccessResourceFailureException;
import com.unichat.core.admin.api.AiAdmissionRequest;
import com.unichat.core.admin.api.AiAdmissionResponse;
import com.unichat.core.chat.service.ChatOperationError;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

class AiAdmissionServiceTest {
    private final AiAdmissionRepository repository = mock(AiAdmissionRepository.class);
    private final AuditService audit = mock(AuditService.class);
    private final AiAdmissionService service = new AiAdmissionService(repository, audit);
    private final UUID actor = UUID.randomUUID();

    @Test void shouldFailClosedWhenSingletonIsUnavailable() {
        when(repository.lock(false)).thenThrow(new DataAccessResourceFailureException("hidden"));
        assertEquals("AI_MAINTENANCE", assertThrows(AiMaintenanceError.class, service::lockShared).getCode());
    }
    @Test void shouldFailClosedWhenSingletonIsMissing() {
        assertThrows(AiMaintenanceError.class, service::lockShared);
    }
    @Test void shouldFailClosedForUnavailableStatusCountsAndExclusiveTransitionLock() {
        when(repository.lock(false)).thenReturn(control("OPEN", 0, 0));
        when(repository.counts(any())).thenThrow(new DataAccessResourceFailureException("hidden"));
        assertThrows(AiMaintenanceError.class, service::status);
        when(repository.lock(true)).thenThrow(new DataAccessResourceFailureException("hidden"));
        assertThrows(AiMaintenanceError.class, () -> service.update(actor, new AiAdmissionRequest("DRAINING", 4L)));
        verifyNoInteractions(audit);
    }
    @Test void shouldAllowOnlyOpenForNewChatsAndVerificationForDiagnostics() {
        service.requireChat(control("OPEN", 0, 0));
        service.requireDiagnostic(control("VERIFYING", 0, 0));
        assertThrows(AiMaintenanceError.class, () -> service.requireChat(control("VERIFYING", 0, 0)));
        assertThrows(AiMaintenanceError.class, () -> service.requireDiagnostic(control("DRAINING", 0, 0)));
    }
    @Test void shouldRejectStaleVersionEvenWhenStateIsIdentical() {
        arrange("OPEN", 0, 0);
        assertEquals("ADMISSION_VERSION_CONFLICT", assertThrows(ChatOperationError.class,
                () -> service.update(actor, new AiAdmissionRequest("OPEN", 3L))).getCode());
        verifyNoInteractions(audit); verify(repository, never()).update(any(), any());
    }
    @Test void shouldKeepSameStateIdempotentWithoutAuditOrVersionIncrement() {
        arrange("DRAINING", 1, 2);
        assertEquals(4, service.update(actor, new AiAdmissionRequest("DRAINING", 4L)).version());
        verifyNoInteractions(audit); verify(repository, never()).update(any(), any());
    }
    @Test void shouldRejectDirectOpenToVerifying() {
        arrange("OPEN", 0, 0);
        assertEquals("ADMISSION_TRANSITION_INVALID", assertThrows(ChatOperationError.class,
                () -> service.update(actor, new AiAdmissionRequest("VERIFYING", 4L))).getCode());
    }
    @Test void shouldRetainUnknownPendingAttemptsAndRejectIncompleteDrain() {
        arrange("DRAINING", 0, 1);
        assertEquals("ADMISSION_NOT_DRAINED", assertThrows(ChatOperationError.class,
                () -> service.update(actor, new AiAdmissionRequest("VERIFYING", 4L))).getCode());
        arrange("DRAINING", 1, 0);
        assertThrows(ChatOperationError.class, () -> service.update(actor, new AiAdmissionRequest("VERIFYING", 4L)));
        verify(repository, never()).update(any(), any());
    }
    @Test void shouldAuditCompletedDrainTransitionAndPermitExplicitAbort() {
        arrange("DRAINING", 0, 0);
        assertEquals(5, service.update(actor, new AiAdmissionRequest("VERIFYING", 4L)).version());
        verify(audit).record(actor, "AI_ADMISSION_VERIFYING", "AI_GENERATION_CONTROL", null, "SUCCESS");
        arrange("DRAINING", 2, 1);
        assertEquals("OPEN", service.update(actor, new AiAdmissionRequest("OPEN", 4L)).state());
    }
    private void arrange(String state, long running, long pending) {
        var control = control(state, running, pending);
        when(repository.lock(true)).thenReturn(control); when(repository.counts(control)).thenReturn(control);
    }
    private AiAdmissionResponse control(String state, long running, long pending) {
        return new AiAdmissionResponse(state, 4, running, pending);
    }
}
