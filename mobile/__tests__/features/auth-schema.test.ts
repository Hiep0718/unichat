import {
  loginSchema,
  registerSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
} from '../../src/features/auth/auth-schema';

describe('Auth Validation Schemas (Zod v4)', () => {
  describe('loginSchema', () => {
    it('should validate valid email and 12+ character password', () => {
      const result = loginSchema.safeParse({
        email: 'student@unichat.vn',
        password: 'Password123456!',
      });
      expect(result.success).toBe(true);
    });

    it('should reject invalid email format', () => {
      const result = loginSchema.safeParse({
        email: 'invalid-email',
        password: 'Password123456!',
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toBe('Định dạng email không hợp lệ');
      }
    });

    it('should reject password with less than 12 characters', () => {
      const result = loginSchema.safeParse({
        email: 'student@unichat.vn',
        password: 'short',
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toBe('Mật khẩu phải từ 12 ký tự trở lên');
      }
    });
  });

  describe('registerSchema', () => {
    it('should validate matching passwords', () => {
      const result = registerSchema.safeParse({
        email: 'student@unichat.vn',
        password: 'SecurePassword123!',
        confirmPassword: 'SecurePassword123!',
      });
      expect(result.success).toBe(true);
    });

    it('should reject mismatched password confirmation', () => {
      const result = registerSchema.safeParse({
        email: 'student@unichat.vn',
        password: 'SecurePassword123!',
        confirmPassword: 'DifferentPassword!',
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toBe('Mật khẩu xác nhận không khớp');
      }
    });
  });

  describe('forgotPasswordSchema & resetPasswordSchema', () => {
    it('should validate email for forgotPassword', () => {
      const result = forgotPasswordSchema.safeParse({ email: 'user@unichat.vn' });
      expect(result.success).toBe(true);
    });

    it('should validate 6-digit OTP and new password for resetPassword', () => {
      const result = resetPasswordSchema.safeParse({
        email: 'user@unichat.vn',
        otp: '123456',
        newPassword: 'BrandNewPassword123!',
        confirmPassword: 'BrandNewPassword123!',
      });
      expect(result.success).toBe(true);
    });

    it('should reject OTP not having 6 digits', () => {
      const result = resetPasswordSchema.safeParse({
        email: 'user@unichat.vn',
        otp: '12',
        newPassword: 'BrandNewPassword123!',
        confirmPassword: 'BrandNewPassword123!',
      });
      expect(result.success).toBe(false);
    });
  });
});
