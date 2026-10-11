/** RFC 7807 failure preserving status and safe client-facing details. */
export class ApiError extends Error {
  constructor(public readonly status: number, message: string, public readonly data?: unknown) {
    super(message);
    this.name = 'ApiError';
  }
}

/** Parses JSON or an empty response without treating malformed success as data. */
export async function readApiResponse<T>(response: Response): Promise<T> {
  const text = await response.text();
  const data: unknown = text ? parseJson(text) : null;
  if (!response.ok) throw new ApiError(response.status, errorMessage(data), data);
  if (text && data === null) throw new ApiError(502, 'Phản hồi máy chủ không hợp lệ');
  return data as T;
}

function parseJson(text: string): unknown {
  try { return JSON.parse(text) as unknown; }
  catch { return null; }
}

function errorMessage(data: unknown): string {
  if (!data || typeof data !== 'object') return 'Không thể hoàn tất yêu cầu';
  const problem = data as Record<string, unknown>;
  const fields = problem.fieldErrors;
  if (fields && typeof fields === 'object') {
    const first = Object.values(fields).flat().find((value) => typeof value === 'string');
    if (typeof first === 'string') return first;
  }
  const message = problem.detail ?? problem.title ?? problem.message;
  return typeof message === 'string' ? message : 'Không thể hoàn tất yêu cầu';
}
