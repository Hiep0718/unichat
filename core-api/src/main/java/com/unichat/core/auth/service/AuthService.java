package com.unichat.core.auth.service;

import java.security.SecureRandom;
import java.time.Clock;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.UUID;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.unichat.core.auth.api.ForgotPasswordRequest;
import com.unichat.core.auth.api.LoginRequest;
import com.unichat.core.auth.api.LoginResponse;
import com.unichat.core.auth.api.RegisterRequest;
import com.unichat.core.auth.api.ResetPasswordRequest;
import com.unichat.core.auth.domain.PasswordResetOtp;
import com.unichat.core.auth.domain.PasswordResetOtpRepository;
import com.unichat.core.common.error.ConflictError;
import com.unichat.core.common.error.NotFoundError;
import com.unichat.core.common.error.UnauthenticatedError;
import com.unichat.core.common.error.ValidationError;
import com.unichat.core.user.api.UserResponse;
import com.unichat.core.user.domain.SystemRole;
import com.unichat.core.user.domain.User;
import com.unichat.core.user.domain.UserRepository;
import com.unichat.core.user.domain.UserStatus;
import com.unichat.core.shared.util.UuidGenerator;

/**
 * Handles core identity operations including registration, login state, and refresh sessions.
 */
@Service
public class AuthService {

    private static final Logger LOGGER = LoggerFactory.getLogger(AuthService.class);
    private static final SecureRandom RANDOM = new SecureRandom();

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final TokenService tokenService;
    private final PasswordResetOtpRepository passwordResetOtpRepository;
    private final JavaMailSender mailSender;
    private final Clock clock;

    public AuthService(
            UserRepository userRepository,
            PasswordEncoder passwordEncoder,
            TokenService tokenService,
            PasswordResetOtpRepository passwordResetOtpRepository,
            JavaMailSender mailSender,
            Clock clock) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
        this.tokenService = tokenService;
        this.passwordResetOtpRepository = passwordResetOtpRepository;
        this.mailSender = mailSender;
        this.clock = clock;
    }

    /**
     * Registers a new user.
     */
    @Transactional
    public UserResponse register(RegisterRequest request) {
        if (userRepository.existsByEmailIgnoreCase(request.email())) {
            throw new ConflictError("Email đã được sử dụng trên hệ thống.");
        }

        Instant now = Instant.now(clock);
        User user = new User(
                UuidGenerator.generateV7(),
                request.email(),
                passwordEncoder.encode(request.password()),
                SystemRole.USER,
                UserStatus.ACTIVE,
                now
        );

        userRepository.save(user);
        return UserResponse.from(user);
    }

    /**
     * Authenticates credentials and issues tokens.
     */
    @Transactional
    public TokenPair login(LoginRequest request) {
        Instant now = Instant.now(clock);
        User user = userRepository.findByEmailIgnoreCase(request.email())
                .orElseThrow(() -> new UnauthenticatedError("Tài khoản hoặc mật khẩu không chính xác"));

        // Check if account is locked
        if (UserStatus.LOCKED.equals(user.getStatus()) || (user.getLockedUntil() != null && user.getLockedUntil().isAfter(now))) {
            if (user.getLockedUntil() != null && user.getLockedUntil().isBefore(now)) {
                // Auto-unlock
                user.setStatus(UserStatus.ACTIVE);
                user.setFailedLoginCount(0);
                user.setLockedUntil(null);
            } else {
                throw new UnauthenticatedError("Tài khoản đã bị khóa. Vui lòng thử lại sau.");
            }
        }

        // Verify password
        if (!passwordEncoder.matches(request.password(), user.getPasswordHash())) {
            int attempts = user.getFailedLoginCount() + 1;
            user.setFailedLoginCount(attempts);
            if (attempts >= 5) {
                user.setStatus(UserStatus.LOCKED);
                user.setLockedUntil(now.plus(15, ChronoUnit.MINUTES));
            }
            userRepository.save(user);
            throw new UnauthenticatedError("Tài khoản hoặc mật khẩu không chính xác");
        }

        // Success - reset counters
        user.setFailedLoginCount(0);
        user.setLockedUntil(null);
        userRepository.save(user);

        String accessToken = tokenService.generateAccessToken(user);
        UUID familyId = UUID.randomUUID();
        String refreshToken = tokenService.createRefreshToken(user.getId(), familyId);

        return new TokenPair(accessToken, refreshToken);
    }

    /**
     * Performs refresh token rotation and generates a new access token.
     */
    @Transactional
    public TokenPair refresh(String rawRefreshToken) {
        String nextRawRefreshToken = tokenService.rotateRefreshToken(rawRefreshToken);
        UUID userId = tokenService.getUserIdFromRefreshToken(nextRawRefreshToken);
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new UnauthenticatedError("Người dùng không tồn tại"));

        if (UserStatus.LOCKED.equals(user.getStatus())) {
            throw new UnauthenticatedError("Tài khoản đang bị khóa");
        }

        String accessToken = tokenService.generateAccessToken(user);
        return new TokenPair(accessToken, nextRawRefreshToken);
    }

    /**
     * Generates a 6-digit OTP for resetting password, saves it and logs it.
     */
    @Transactional
    public void requestPasswordReset(ForgotPasswordRequest request) {
        String email = request.email();
        if (!userRepository.existsByEmailIgnoreCase(email)) {
            throw new NotFoundError("Email không tồn tại trên hệ thống");
        }

        // Generate 6-digit OTP code
        String otpCode = String.format("%06d", 100000 + RANDOM.nextInt(900000));
        Instant now = Instant.now(clock);
        Instant expiresAt = now.plusSeconds(300); // 5 minutes expiration

        PasswordResetOtp otp = new PasswordResetOtp(
            email.toLowerCase(),
            otpCode,
            expiresAt,
            now
        );

        passwordResetOtpRepository.save(otp);

        LOGGER.info("[OTP] Mã OTP khôi phục mật khẩu của email {} là: {}", email, otpCode);
        sendOtpEmail(email, otpCode);
    }

    private void sendOtpEmail(String email, String otpCode) {
        try {
            SimpleMailMessage message = new SimpleMailMessage();
            message.setTo(email);
            message.setSubject("Mã OTP khôi phục mật khẩu UniChat");
            message.setText("Chào bạn,\n\nMã OTP khôi phục mật khẩu UniChat của bạn là: " + otpCode + 
                           "\n\nMã OTP này có hiệu lực trong vòng 5 phút. Vui lòng không chia sẻ mã này cho bất kỳ ai.\n\nTrân trọng,\nUniChat Team");
            mailSender.send(message);
            LOGGER.info("[Email] Đã gửi email chứa mã OTP khôi phục mật khẩu thành công đến: {}", email);
        } catch (Exception e) {
            LOGGER.error("[Email] Không thể gửi email thật đến {} do lỗi: {}.", email, e.getMessage());
        }
    }


    /**
     * Verifies OTP and resets the password for the specified email.
     */
    @Transactional
    public void resetPassword(ResetPasswordRequest request) {
        String email = request.email().toLowerCase();
        PasswordResetOtp otp = passwordResetOtpRepository.findByEmailIgnoreCase(email)
                .orElseThrow(() -> new ValidationError("Mã OTP không chính xác"));

        if (!otp.getOtpCode().equals(request.otp())) {
            throw new ValidationError("Mã OTP không chính xác");
        }

        if (otp.getExpiresAt().isBefore(Instant.now(clock))) {
            throw new ValidationError("Mã OTP đã hết hạn");
        }

        User user = userRepository.findByEmailIgnoreCase(email)
                .orElseThrow(() -> new NotFoundError("Người dùng không tồn tại"));

        user.setPasswordHash(passwordEncoder.encode(request.newPassword()));
        user.setUpdatedAt(Instant.now(clock));
        userRepository.save(user);

        // Delete OTP after successful reset
        passwordResetOtpRepository.delete(otp);
    }


    /**
     * Revokes all tokens in the session.
     */
    @Transactional
    public void logout(String rawRefreshToken) {
        if (rawRefreshToken != null && !rawRefreshToken.isBlank()) {
            tokenService.revokeFamily(rawRefreshToken);
        }
    }

    /**
     * Container holding access and refresh token pair.
     */
    public record TokenPair(String accessToken, String refreshToken) {}
}
