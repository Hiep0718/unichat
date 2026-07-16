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
  role: string;
  createdAt: string;
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
};
