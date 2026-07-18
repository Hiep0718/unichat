package com.unichat.core.auth.domain;

import java.util.Optional;
import org.springframework.data.repository.CrudRepository;
import org.springframework.stereotype.Repository;

/**
 * Repository interface for managing PasswordResetOtp.
 */
@Repository
public interface PasswordResetOtpRepository extends CrudRepository<PasswordResetOtp, String> {
    Optional<PasswordResetOtp> findByEmailIgnoreCase(String email);
}
