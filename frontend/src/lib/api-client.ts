/**
 * Generic API client and types for UniChat.
 * Token storage is managed externally via registerTokenAccessor (ADR-005).
 */

export function getApiBaseUrl(): string {
  const customBase = import.meta.env.VITE_API_BASE_URL as string | undefined;
  if (customBase) {
    return customBase.endsWith('/') ? customBase.slice(0, -1) : customBase;
  }
  return '';
}

const API_BASE = `${getApiBaseUrl()}/api/v1`;

/** Registered accessor — getter for current in-memory token. */
let getToken: () => string | null = () => null;

/** Registered accessor — setter when refresh succeeds. */
let setToken: (token: string) => void = () => {};

/** Registered accessor — clearer on auth failure. */
let clearToken: () => void = () => {};

/**
 * Registers callbacks so the api-client can read/write the access token
 * without depending on React context directly.
 *
 * @param getter returns current access token from memory
 * @param setter stores a refreshed access token back into memory
 * @param clearer removes the access token (triggers logout)
 */
export function registerTokenAccessor(
  getter: () => string | null,
  setter: (token: string) => void,
  clearer: () => void,
): void {
  getToken = getter;
  setToken = setter;
  clearToken = clearer;
}

export function getAccessToken(): string | null {
  return getToken();
}


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

/**
 * Fetches a binary resource that needs the bearer token.
 *
 * `<img src>` and friends cannot send an Authorization header, so anything
 * behind auth has to be read this way and turned into a blob URL.
 *
 * @throws ApiError when the request fails, carrying the status so a caller can
 *         tell "not set" (404) apart from a real failure
 */
export async function fetchBlob(path: string): Promise<Blob> {
  const token = getToken();
  const response = await fetch(`${API_BASE}${path}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });

  if (!response.ok) {
    throw new ApiError(response.status, `Không tải được dữ liệu (HTTP ${response.status})`);
  }
  return response.blob();
}

export async function fetchJson<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const headers = new Headers(options.headers);
  if (!headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  const token = getToken();
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
        setToken(newToken);

        // Retry the original request with the new token
        headers.set('Authorization', `Bearer ${newToken}`);
        const retryResponse = await fetch(`${API_BASE}${endpoint}`, {
          ...options,
          headers,
        });

        return handleResponse<T>(retryResponse);
      } else {
        // Refresh token expired or invalid, log out
        clearToken();
        window.location.href = '/login';
        throw new ApiError(response.status, 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.');
      }
    } catch (refreshError) {
      clearToken();
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
