import { fetchJson } from '../../lib/api-client';
import { generateIdempotencyKey } from '../../lib/idempotency';
import {
  LoginRequest,
  MobileLoginResponse,
  RegisterRequest,
  UserResponse,
  ForgotPasswordRequest,
  ResetPasswordRequest,
} from '../../types/api';

/**
 * Authentication API services for UniChat Mobile.
 */
export const authApi = {
  /**
   * Log in user and receive both accessToken and refreshToken in response body.
   */
  login: (data: LoginRequest): Promise<MobileLoginResponse> => {
    return fetchJson<MobileLoginResponse>('/auth/login', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  /**
   * Register a new user account with idempotent request guarantee.
   */
  register: (data: RegisterRequest): Promise<UserResponse> => {
    return fetchJson<UserResponse>('/auth/register', {
      method: 'POST',
      headers: {
        'Idempotency-Key': generateIdempotencyKey(),
      },
      body: JSON.stringify(data),
    });
  },

  /**
   * Revoke active session using body-transmitted refresh token.
   */
  logout: (refreshToken: string): Promise<void> => {
    return fetchJson<void>('/auth/logout', {
      method: 'POST',
      headers: {
        'Idempotency-Key': generateIdempotencyKey(),
      },
      body: JSON.stringify({ refreshToken }),
    });
  },

  /**
   * Fetch current authenticated user profile.
   */
  getMe: (): Promise<UserResponse> => {
    return fetchJson<UserResponse>('/users/me', {
      method: 'GET',
    });
  },

  /**
   * Request a 6-digit OTP code for password reset.
   */
  forgotPassword: (data: ForgotPasswordRequest): Promise<void> => {
    return fetchJson<void>('/auth/forgot-password', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  /**
   * Reset password with valid OTP code.
   */
  resetPassword: (data: ResetPasswordRequest): Promise<void> => {
    return fetchJson<void>('/auth/reset-password', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },
};
