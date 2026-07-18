-- V2__password_reset_otps.sql
CREATE TABLE password_reset_otps (
    email VARCHAR(255) PRIMARY KEY,
    otp_code VARCHAR(6) NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
