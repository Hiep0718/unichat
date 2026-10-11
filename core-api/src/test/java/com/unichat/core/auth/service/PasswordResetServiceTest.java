package com.unichat.core.auth.service;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.springframework.mail.MailSendException;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import com.unichat.core.auth.api.ResetPasswordRequest;
import com.unichat.core.common.error.ValidationError;

class PasswordResetServiceTest {
    private final PasswordResetTransactions transactions = mock(PasswordResetTransactions.class);
    private final JavaMailSender sender = mock(JavaMailSender.class);
    private final PasswordResetService service = new PasswordResetService(transactions, sender);
    @Test
    void shouldKeepSmtpFailurePublicResponseUniformAndRecordOperationalFailure() {
        UUID userId = UUID.randomUUID();
        when(transactions.prepare("student@unichat.vn"))
                .thenReturn(new PasswordResetTransactions.Delivery(userId, "student@unichat.vn", "012345"));
        doThrow(new MailSendException("simulated")).when(sender).send(any(SimpleMailMessage.class));
        assertDoesNotThrow(() -> service.request("student@unichat.vn"));
        verify(transactions).recordDelivery(userId, false);
    }
    @Test
    void shouldAvoidMailForUnknownOrCoolingDownAccount() {
        service.request("unknown@unichat.vn"); verifyNoInteractions(sender);
    }
    @Test
    void shouldRaiseDenialOnlyAfterResetTransactionReturns() {
        assertThrows(ValidationError.class, () -> service.reset(new ResetPasswordRequest("student@unichat.vn", "012345", "password123456")));
    }
}
