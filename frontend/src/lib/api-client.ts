/**
 * Generic API client and types for UniChat.
 */

const API_BASE = '/api/v1';

export class ApiError extends Error {
  public status: number;
  public data: unknown;

  constructor(status: number, message: string, data?: unknown) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.data = data;
  }
}

export async function fetchJson<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const headers = new Headers(options.headers);
  if (!headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  const token = localStorage.getItem('accessToken');
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers,
  });

  // Handle unauthorized (expired token) and make sure it's not the auth endpoints themselves
  if (response.status === 401 && endpoint !== '/auth/refresh' && endpoint !== '/auth/login') {
    try {
      // Try to refresh the token
      const refreshResponse = await fetch(`${API_BASE}/auth/refresh`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (refreshResponse.ok) {
        const refreshData = await refreshResponse.json();
        const newToken = refreshData.accessToken;
        localStorage.setItem('accessToken', newToken);

        // Retry the original request with the new token
        headers.set('Authorization', `Bearer ${newToken}`);
        const retryResponse = await fetch(`${API_BASE}${endpoint}`, {
          ...options,
          headers,
        });

        return handleResponse<T>(retryResponse);
      } else {
        // Refresh token expired or invalid, log out
        localStorage.removeItem('accessToken');
        window.location.href = '/login';
        throw new ApiError(response.status, 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.');
      }
    } catch (refreshError) {
      localStorage.removeItem('accessToken');
      window.location.href = '/login';
      throw refreshError;
    }
  }

  return handleResponse<T>(response);
}

async function handleResponse<T>(response: Response): Promise<T> {
  let data;
  try {
    data = await response.json();
  } catch {
    data = null;
  }

  if (!response.ok) {
    let message = data?.detail || data?.title || data?.message || 'Đã xảy ra lỗi hệ thống';
    
    // Extract first validation error if present (RFC 7807 Problem Detail format)
    if (data?.fieldErrors && typeof data.fieldErrors === 'object') {
      const fieldErrorsObj = data.fieldErrors as Record<string, unknown>;
      const fieldMessages = Object.values(fieldErrorsObj).flat();
      if (fieldMessages.length > 0) {
        message = fieldMessages[0] as string;
      }
    }

    throw new ApiError(response.status, message, data);
  }

  return data as T;
}
