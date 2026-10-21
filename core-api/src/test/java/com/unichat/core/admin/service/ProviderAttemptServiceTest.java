package com.unichat.core.admin.service;

import java.time.Clock;
import java.time.Instant;
import java.util.Optional;
import java.util.UUID;
import jakarta.persistence.EntityManager;
import jakarta.persistence.Query;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import com.unichat.core.admin.api.AiAdmissionResponse;
import com.unichat.core.admin.api.ProviderAttemptRequest;
import com.unichat.core.admin.domain.ProviderAttempt;
import com.unichat.core.admin.domain.ProviderAttemptRepository;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;
import static org.mockito.ArgumentMatchers.*;

class ProviderAttemptServiceTest {
    private final EntityManager entities = mock(EntityManager.class);
    private final ProviderAttemptRepository repository = mock(ProviderAttemptRepository.class);
    private final AiAdmissionService admission = mock(AiAdmissionService.class);
    private final ProviderAttempt attempt = mock(ProviderAttempt.class);
    private final ProviderAttemptService service = new ProviderAttemptService(entities, repository, Clock.systemUTC(), admission);
    private final AiAdmissionResponse draining = new AiAdmissionResponse("DRAINING", 1, 0, 1);
    @BeforeEach void arrange() { when(admission.lockShared()).thenReturn(draining); }

    @Test void shouldReplayCommittedDiagnosticStartWhileDrainingWithoutNewInsert() {
        var request = request("ADMIN_PROMPT", "START");
        when(repository.lockById(request.attemptId())).thenReturn(Optional.of(attempt));
        service.record(request);
        verify(admission, never()).requireDiagnostic(any()); verifyNoInteractions(entities);
        verify(attempt, times(2)).verifyIdentity(request);
    }
    @Test void shouldRejectNewDiagnosticBeforeInsertWhileDraining() {
        var request = request("KEY_PROBE", "START");
        when(repository.lockById(request.attemptId())).thenReturn(Optional.empty());
        doThrow(new AiMaintenanceError()).when(admission).requireDiagnostic(draining);
        assertThrows(AiMaintenanceError.class, () -> service.record(request));
        verifyNoInteractions(entities);
        var ordering = inOrder(admission, repository);
        ordering.verify(admission).lockShared(); ordering.verify(repository).lockById(request.attemptId());
    }
    @Test void shouldAdmitAndInsertDiagnosticWithinSameTransaction() {
        var request = request("ADMIN_PROMPT", "START");
        when(repository.lockById(request.attemptId())).thenReturn(Optional.empty(), Optional.of(attempt));
        Query query = mock(Query.class); when(entities.createNativeQuery(anyString())).thenReturn(query);
        when(query.setParameter(anyString(), any())).thenReturn(query);
        service.record(request);
        var ordering = inOrder(admission, entities, query);
        ordering.verify(admission).lockShared(); ordering.verify(admission).requireDiagnostic(draining);
        ordering.verify(entities).createNativeQuery(anyString()); verify(query).executeUpdate();
    }
    @Test void shouldAcceptEndWithoutAdmissionDuringDrain() {
        var request = request("KEY_PROBE", "END");
        when(repository.lockById(request.attemptId())).thenReturn(Optional.of(attempt));
        service.record(request);
        verifyNoInteractions(admission, entities); verify(attempt).finish(request);
    }
    @Test void shouldAllowAlreadyAdmittedChatStartWithoutGateCheck() {
        var request = request("CHAT", "START");
        when(repository.lockById(request.attemptId())).thenReturn(Optional.of(attempt));
        service.record(request);
        verifyNoInteractions(admission, entities);
    }
    @Test void shouldRejectFutureTimestampsBeforeAdmission() {
        var request = new ProviderAttemptRequest(UUID.randomUUID(), null, "KEY_PROBE", "hive", "hive-primary",
                "deepseek-ai/deepseek-v4.1-flash", "START", null, Instant.now().plusSeconds(120), null, null, null, null);
        assertThrows(com.unichat.core.common.error.ValidationError.class, () -> service.record(request));
        verifyNoInteractions(admission, entities, repository);
    }
    private ProviderAttemptRequest request(String purpose, String phase) {
        return new ProviderAttemptRequest(UUID.randomUUID(), "CHAT".equals(purpose) ? UUID.randomUUID() : null,
                purpose, "hive", "hive-primary", "deepseek-ai/deepseek-v4.1-flash", phase,
                "END".equals(phase) ? "SUCCESS" : null, Instant.now(), null, null, null, null);
    }
}
