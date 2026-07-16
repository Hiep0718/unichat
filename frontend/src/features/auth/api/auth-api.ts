/**
 * Authentication API endpoints and types.
 */
import { fetchJson } from '../../../lib/api-client';

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
}

export interface AuthResponse {
  accessToken: string;
  tokenType: string;
  expiresIn: number;
}

export interface UserResponse {
  id: string;
  email: string;
  systemRole: 'USER' | 'ADMIN';
  status: 'ACTIVE' | 'LOCKED';
  createdAt: string;
  updatedAt: string;
}

export const authApi = {
  /**
   * Log in user and receive access token (refresh token is set via HttpOnly cookie).
   */
  login: (data: LoginRequest): Promise<AuthResponse> => {
    return fetchJson('/auth/login', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  /**
   * Register a new user account.
   */
  register: (data: RegisterRequest): Promise<UserResponse> => {
    return fetchJson('/auth/register', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  /**
   * Get the current authenticated user's profile.
   */
  getMe: (): Promise<UserResponse> => {
    return fetchJson('/users/me', {
      method: 'GET',
    });
  },

  /**
   * Log out the current user session.
   */
  logout: (): Promise<void> => {
    return fetchJson('/auth/logout', {
      method: 'POST',
    });
  },

  /**
   * Initiate forgot password flow by requesting an OTP.
   */
  forgotPassword: (data: { email: string }): Promise<void> => {
    return fetchJson('/auth/forgot-password', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  /**
   * Complete password reset using email, OTP, and new password.
   */
  resetPassword: (data: { email: string; otp: string; newPassword: string }): Promise<void> => {
    return fetchJson('/auth/reset-password', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },
};
