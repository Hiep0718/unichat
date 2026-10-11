package com.unichat.core.auth.service;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.mail.MailException;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.stereotype.Service;
import com.unichat.core.auth.api.ResetPasswordRequest;
import com.unichat.core.common.error.ValidationError;

/** Uniform public reset flow with separately observed SMTP delivery failures. */
@Service
public class PasswordResetService {
    private static final Logger LOGGER = LoggerFactory.getLogger(PasswordResetService.class);
    private final PasswordResetTransactions transactions;
    private final JavaMailSender sender;
    /** Uses transaction results rather than sending mail inside account locks. */
    public PasswordResetService(PasswordResetTransactions transactions, JavaMailSender sender) {
        this.transactions = transactions; this.sender = sender;
    }
    /** Does not expose account existence, cooldown state or SMTP errors. */
    public void request(String email) {
        var delivery = transactions.prepare(email);
        if (delivery == null) return;
        boolean sent = send(delivery);
        transactions.recordDelivery(delivery.userId(), sent);
    }
    private boolean send(PasswordResetTransactions.Delivery delivery) {
        SimpleMailMessage message = new SimpleMailMessage();
        message.setTo(delivery.email());
        message.setSubject("Mã OTP khôi phục mật khẩu UniChat");
        message.setText("Mã OTP của bạn: " + delivery.code()
                + "\nMã có hiệu lực 5 phút. Vui lòng không chia sẻ mã này.");
        try {
            sender.send(message);
            return true;
        } catch (MailException error) {
            LOGGER.warn("otp_delivery_failed operation=send_reset_email errorType={}", error.getClass().getSimpleName());
            return false;
        }
    }
    /** Throws only after the attempt/password transaction has completed. */
    public void reset(ResetPasswordRequest request) {
        if (!transactions.reset(request)) throw new ValidationError("Mã OTP không hợp lệ hoặc đã hết hạn.");
    }
}