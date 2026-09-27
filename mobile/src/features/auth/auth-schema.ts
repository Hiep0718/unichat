import { z } from 'zod/v4';

/**
 * Authentication validation schemas for UniChat Mobile.
 * Synchronized with Core API RFC 7807 validation rules.
 */
export const loginSchema = z.object({
  email: z
    .string()
    .min(1, 'Email không được để trống')
    .email('Định dạng email không hợp lệ')
    .max(254, 'Email tối đa 254 ký tự'),
  password: z
    .string()
    .min(1, 'Mật khẩu không được để trống')
    .min(12, 'Mật khẩu phải từ 12 ký tự trở lên')
    .max(128, 'Mật khẩu tối đa 128 ký tự'),
});

export type LoginFormData = z.infer<typeof loginSchema>;

export const registerSchema = z
  .object({
    email: z
      .string()
      .min(1, 'Email không được để trống')
      .email('Định dạng email không hợp lệ')
      .max(254, 'Email tối đa 254 ký tự'),
    password: z
      .string()
      .min(12, 'Mật khẩu phải từ 12 ký tự trở lên')
      .max(128, 'Mật khẩu tối đa 128 ký tự'),
    confirmPassword: z.string().min(1, 'Vui lòng xác nhận mật khẩu'),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Mật khẩu xác nhận không khớp',
    path: ['confirmPassword'],
  });

export type RegisterFormData = z.infer<typeof registerSchema>;

export const forgotPasswordSchema = z.object({
  email: z
    .string()
    .min(1, 'Email không được để trống')
    .email('Định dạng email không hợp lệ')
    .max(254, 'Email tối đa 254 ký tự'),
});

export type ForgotPasswordFormData = z.infer<typeof forgotPasswordSchema>;

export const resetPasswordSchema = z
  .object({
    email: z.string().email(),
    otp: z.string().length(6, 'Mã OTP gồm 6 chữ số'),
    newPassword: z
      .string()
      .min(12, 'Mật khẩu phải từ 12 ký tự trở lên')
      .max(128, 'Mật khẩu tối đa 128 ký tự'),
    confirmPassword: z.string().min(1, 'Vui lòng xác nhận mật khẩu'),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: 'Mật khẩu xác nhận không khớp',
    path: ['confirmPassword'],
  });

export type ResetPasswordFormData = z.infer<typeof resetPasswordSchema>;
