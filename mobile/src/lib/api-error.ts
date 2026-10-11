/** Typed RFC 7807 error at the mobile boundary. */
export class ApiError extends Error {
  constructor(public readonly status: number, message: string, public readonly data?: unknown) {
    super(message); this.name = 'ApiError';
  }
}

/** Parses JSON/empty responses, preserving safe server error details. */
export async function readApiResponse<T>(response: Response): Promise<T> {
  const text = await response.text();
  const data: unknown = text ? JSON.parse(text) : null;
  if (!response.ok) {
    const problem = data && typeof data === 'object' ? data as Record<string, unknown> : {};
    const message = problem.detail ?? problem.title ?? problem.message;
    throw new ApiError(response.status, typeof message === 'string' ? message : 'Không thể hoàn tất yêu cầu', data);
  }
  return data as T;
}
