/**
 * Authentication API endpoints and types.
 */
import { fetchJson, fetchAuthorized } from '../../../lib/api-client';
import { cookieRequest, loginCookieSession, logoutCookieSession } from '../../../lib/cookie-session';
import type { AvatarColorKey } from '../../../components/entity-avatar';

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
  /** The name others see; the @mention handle stays derived from the email. */
  displayName: string;
  /** True when a picture was uploaded; otherwise a letter avatar is shown. */
  hasAvatar: boolean;
  /** Chosen letter-avatar colour, or null to derive one from the name. */
  avatarColor: AvatarColorKey | null;
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
    return loginCookieSession(data);
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

  /** Replaces the caller's profile picture. */
  uploadAvatar: async (file: File): Promise<void> => {
    const body = new FormData();
    body.append('file', file);
    const response = await fetchAuthorized('/users/me/avatar', {
      method: 'PUT',
      body,
    });
    if (!response.ok) {
      throw new Error(`Không tải được ảnh lên (HTTP ${response.status})`);
    }
  },

  /** Removes the picture, leaving the letter avatar. */
  removeAvatar: (): Promise<void> => {
    return fetchJson('/users/me/avatar', { method: 'DELETE' });
  },

  /** Chooses the letter-avatar colour; null returns to the derived one. */
  chooseAvatarColor: (color: AvatarColorKey | null): Promise<void> => {
    const query = color ? `?color=${color}` : '';
    return fetchJson(`/users/me/avatar-color${query}`, { method: 'PATCH' });
  },

  /** Renames the caller. Does not affect how they are mentioned. */
  updateProfile: (displayName: string): Promise<UserResponse> => {
    return fetchJson('/users/me', {
      method: 'PATCH',
      body: JSON.stringify({ displayName }),
    });
  },

  /**
   * Log out the current user session.
   */
  logout: (): Promise<void> => {
    return logoutCookieSession();
  },

  /**
   * Initiate forgot password flow by requesting an OTP.
   */
  forgotPassword: (data: { email: string }): Promise<void> => {
    return cookieRequest('/auth/forgot-password', data);
  },

  /**
   * Complete password reset using email, OTP, and new password.
   */
  resetPassword: (data: { email: string; otp: string; newPassword: string }): Promise<void> => {
    return cookieRequest('/auth/reset-password', data);
  },
};
