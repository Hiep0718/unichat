import { ApiError } from '../../lib/api-error';

const MESSAGES: Readonly<Record<string, string>> = {
  AI_MAINTENANCE: 'Dịch vụ AI đang bảo trì. Vui lòng thử lại sau ít phút.',
  PROVIDER_TIMEOUT: 'Dịch vụ AI phản hồi quá chậm. Vui lòng thử lại.',
  PROVIDER_HTTP_400: 'Yêu cầu gửi tới nhà cung cấp AI không tương thích. Vui lòng kiểm tra cấu hình model.',
  PROVIDER_HTTP_408: 'Dịch vụ AI phản hồi quá chậm. Vui lòng thử lại.',
  PROVIDER_HTTP_429: 'Dịch vụ AI đang quá tải. Vui lòng thử lại sau ít phút.',
  PROVIDER_HTTP_401: 'Kết nối nhà cung cấp AI cần được quản trị viên kiểm tra.',
  PROVIDER_HTTP_403: 'Kết nối nhà cung cấp AI cần được quản trị viên kiểm tra.',
  PROVIDER_HTTP_405: 'Tài khoản Hive không đủ credit hoặc đang tạm dừng. Vui lòng kiểm tra Organization Credit.',
  PROVIDER_UNCONFIGURED: 'Nhà cung cấp AI chưa được cấu hình. Vui lòng liên hệ quản trị viên.',
  PROVIDER_KEY_UNKNOWN: 'Khóa nhà cung cấp AI không còn khả dụng. Vui lòng tải lại.',
  CHAT_OPERATION_CANCELLED: 'Yêu cầu AI đã được hủy.',
};

/** Friendly failure retaining the machine code and request identity for recovery. */
export class ChatFailureError extends Error {
  constructor(public readonly code: string, public readonly requestId?: string, fallbackMessage?: string) {
    super(MESSAGES[code] ?? fallbackMessage ?? 'Không thể hoàn tất yêu cầu AI. Vui lòng thử lại hoặc kiểm tra lịch sử hội thoại.');
    this.name = 'ChatFailureError';
  }
}

/** Reads safe machine codes only; provider response text is never rendered. */
export function friendlyChatError(failure: unknown): ChatFailureError {
  if (failure instanceof ChatFailureError) return failure;
  const data = failure instanceof ApiError ? failure.data : failure;
  const record = data && typeof data === 'object' ? data as Record<string, unknown> : {};
  const candidate = record.errorCode ?? record.code;
  const code = typeof candidate === 'string' ? candidate
    : failure instanceof ApiError && failure.status === 429 ? 'PROVIDER_HTTP_429' : 'AI_REQUEST_FAILED';
  const fallback = !candidate && failure instanceof ApiError && failure.status < 500 && failure.status !== 429
    ? failure.message : undefined;
  return new ChatFailureError(code, typeof record.requestId === 'string' ? record.requestId : undefined, fallback);
}

/** Distinguishes an explicit failed operation from an interrupted subscription. */
export function isTerminalChatFailure(failure: unknown): boolean {
  if (failure instanceof ChatFailureError) return true;
  if (!(failure instanceof ApiError)) return false;
  const { code } = friendlyChatError(failure);
  return failure.status < 500 || code === 'AI_MAINTENANCE'
    || code.startsWith('PROVIDER_') || code.startsWith('CHAT_OPERATION_');
}
