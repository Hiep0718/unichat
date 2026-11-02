package com.unichat.core.shared.servicesecurity;

import java.time.Instant;
import java.util.UUID;
import com.unichat.core.admin.api.ProviderAttemptRequest;
import com.unichat.core.admin.service.ProviderAttemptService;
import com.unichat.core.chat.domain.ChatOperation;
import com.unichat.core.chat.service.ChatOperationService;
import org.junit.jupiter.api.Test;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

class PrivateCoreControllerTest {
    private final ChatOperationService operations = mock(ChatOperationService.class);
    private final ProviderAttemptService attempts = mock(ProviderAttemptService.class);
    private final PrivateCoreController controller = new PrivateCoreController(
            mock(ServiceNonceService.class), operations, attempts,
            mock(com.unichat.core.chat.service.WorkspaceSummaryJobService.class),
            mock(com.unichat.core.chat.service.WorkspaceSummaryLifecycleService.class));

    @Test void shouldCheckpointQueryPlanAgainstTheAuthorizedChatOperation() {
        UUID operationId = UUID.randomUUID();
        ChatOperation operation = operation("request-id");
        when(operations.checkpoint(operationId)).thenReturn(operation);

        var response = controller.checkpoint(operationId,
                new PrivateCoreController.CheckpointRequest("request-id", "QUERY_PLAN", UUID.randomUUID()));

        assertEquals(Boolean.TRUE, response.get("allowed"));
        verify(operations).checkpoint(operationId);
    }

    @Test void shouldRequireOperationCheckpointBeforeRecordingQueryPlanStart() {
        UUID operationId = UUID.randomUUID();
        ProviderAttemptRequest request = new ProviderAttemptRequest(
                UUID.randomUUID(), operationId, "QUERY_PLAN", "hive", "hive-primary", "fixture-model",
                "START", null, Instant.now(), null, null, null, null);

        controller.attempt(request);

        var ordering = inOrder(operations, attempts);
        ordering.verify(operations).checkpoint(operationId);
        ordering.verify(attempts).record(request);
    }

    @Test void shouldRejectQueryPlanStartWithoutOperationBinding() {
        ProviderAttemptRequest request = attemptRequest("QUERY_PLAN", null, "START");

        assertThrows(com.unichat.core.common.error.ValidationError.class,
                () -> controller.attempt(request));

        verifyNoInteractions(operations, attempts);
    }

    @Test void shouldKeepDiagnosticsOutsideOperationCheckpointPath() {
        ProviderAttemptRequest request = attemptRequest("ADMIN_PROMPT", null, "START");

        controller.attempt(request);

        verifyNoInteractions(operations);
        verify(attempts).record(request);
    }

    @Test void shouldRejectDiagnosticAttemptWithOperationBinding() {
        ProviderAttemptRequest request = attemptRequest("KEY_PROBE", UUID.randomUUID(), "START");

        assertThrows(com.unichat.core.common.error.ValidationError.class,
                () -> controller.attempt(request));

        verifyNoInteractions(operations, attempts);
    }

    @Test void shouldRecordQueryPlanEndWithoutRepeatingCheckpoint() {
        UUID operationId = UUID.randomUUID();
        ProviderAttemptRequest request = attemptRequest("QUERY_PLAN", operationId, "END");

        controller.attempt(request);

        verifyNoInteractions(operations);
        verify(attempts).record(request);
    }

    private static ProviderAttemptRequest attemptRequest(String purpose, UUID operationId, String phase) {
        String outcome = "END".equals(phase) ? "SUCCESS" : null;
        return new ProviderAttemptRequest(UUID.randomUUID(), operationId, purpose, "hive", "hive-primary",
                "fixture-model", phase, outcome, Instant.now(), null, null, null, null);
    }

    private static ChatOperation operation(String requestId) {
        return new ChatOperation(null, null, null, null, null, null, null, null, null, null, false,
                requestId, "RUNNING", null, null, Instant.now().plusSeconds(30), null, null);
    }
}
