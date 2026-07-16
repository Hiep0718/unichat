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

/**
 * Standard fetch wrapper that handles JSON and throws ApiError for non-2xx responses.
 */
export async function fetchJson<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const headers = new Headers(options.headers);
  if (!headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers,
  });

  let data;
  try {
    data = await response.json();
  } catch {
    data = null;
  }

  if (!response.ok) {
    let message = data?.title || data?.message || 'Đã xảy ra lỗi hệ thống';
    
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
