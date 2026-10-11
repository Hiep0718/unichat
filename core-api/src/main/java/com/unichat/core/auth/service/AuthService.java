package com.unichat.core.auth.service;

import java.time.Clock;
import java.time.Instant;
import java.util.Locale;
import java.util.UUID;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import com.unichat.core.admin.service.AuditService;
import com.unichat.core.auth.api.ForgotPasswordRequest;
import com.unichat.core.auth.api.LoginRequest;
import com.unichat.core.auth.api.RegisterRequest;
import com.unichat.core.auth.api.ResetPasswordRequest;
import com.unichat.core.common.error.UnauthenticatedError;
import com.unichat.core.common.error.ValidationError;
import com.unichat.core.user.api.UserResponse;
import com.unichat.core.user.domain.SystemRole;
import com.unichat.core.user.domain.User;
import com.unichat.core.user.domain.UserRepository;
import com.unichat.core.user.domain.UserStatus;

/** Public identity facade; expected failures are raised after security mutations commit. */
@Service
public class AuthService {
    private final UserRepository users;
    private final PasswordEncoder passwords;
    private final TokenService tokens;
    private final LoginTransactions loginTransactions;
    private final PasswordResetService resets;
    private final AuditService audit;
    private final Clock clock;
    /** Composes focused registration, login, token and password-reset responsibilities. */
    public AuthService(UserRepository users, PasswordEncoder passwords, TokenService tokens,
            LoginTransactions loginTransactions, PasswordResetService resets, AuditService audit, Clock clock) {
        this.users = users; this.passwords = passwords; this.tokens = tokens;
        this.loginTransactions = loginTransactions; this.resets = resets; this.audit = audit; this.clock = clock;
    }
    /** Registers credentials under the new-password policy. */
    @Transactional
    public UserResponse register(RegisterRequest request) {
        String email = request.email().strip().toLowerCase(Locale.ROOT);
        if (users.existsByEmailIgnoreCase(email))
            throw new ValidationError("Không thể hoàn tất đăng ký. Vui lòng thử lại hoặc liên hệ hỗ trợ.");
        User user = new User(UUID.randomUUID(), email, passwords.encode(request.password()),
                SystemRole.USER, UserStatus.ACTIVE, Instant.now(clock));
        users.saveAndFlush(user);
        audit.record(user.getId(), "AUTH_REGISTER", "USER", user.getId(), "SUCCESS");
        return UserResponse.from(user);
    }
    /** Login denials cannot roll back their failed counter or audit event. */
    public TokenPair login(LoginRequest request) {
        var decision = loginTransactions.authenticate(request);
        if (decision.tokens() == null) throw new UnauthenticatedError("Tài khoản hoặc mật khẩu không chính xác.");
        return decision.tokens();
    }
    /** Strict refresh rotation with committed family-reuse revocation. */
    public TokenPair refresh(String rawRefreshToken) { return tokens.refresh(rawRefreshToken); }
    /** Requests an OTP with a uniform public outcome. */
    public void requestPasswordReset(ForgotPasswordRequest request) { resets.request(request.email()); }
    /** Consumes one challenge and revokes all account sessions. */
    public void resetPassword(ResetPasswordRequest request) { resets.reset(request); }
    /** Idempotent session logout. */
    public void logout(String rawRefreshToken) { tokens.revokeFamily(rawRefreshToken); }
    /** Ephemeral credentials returned only through the approved transport branch. */
    public record TokenPair(String accessToken, String refreshToken) { }
}