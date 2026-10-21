import { describe, expect, it } from 'vitest';
import { ApiError } from '../../lib/api-error';
import { ChatFailureError, friendlyChatError, isTerminalChatFailure } from './chat-failures';

describe('ChatFailures', () => {
  it.each(['AI_MAINTENANCE', 'PROVIDER_TIMEOUT', 'PROVIDER_HTTP_400', 'PROVIDER_HTTP_405', 'PROVIDER_HTTP_429', 'PROVIDER_HTTP_401', 'PROVIDER_HTTP_403', 'PROVIDER_UNCONFIGURED', 'PROVIDER_KEY_UNKNOWN'])('should preserve %s and request identity without provider text', (code) => {
    const failure = friendlyChatError(new ApiError(503, 'sensitive upstream body', { errorCode: code, requestId: 'request-1' }));
    expect(failure).toBeInstanceOf(ChatFailureError);
    expect(failure.code).toBe(code);
    expect(failure.requestId).toBe('request-1');
    expect(failure.message).not.toContain('sensitive');
    expect(isTerminalChatFailure(failure)).toBe(true);
  });
  it('should recover interrupted transports but never replay explicit provider failures', () => {
    expect(isTerminalChatFailure(new Error('socket closed'))).toBe(false);
    expect(isTerminalChatFailure(new ApiError(502, 'unavailable'))).toBe(false);
    expect(isTerminalChatFailure(new ApiError(503, 'failed', { errorCode: 'PROVIDER_PROTOCOL_ERROR' }))).toBe(true);
    expect(isTerminalChatFailure(new ApiError(503, 'failed', { code: 'AI_MAINTENANCE' }))).toBe(true);
  });
  it.each([
    ['PROVIDER_HTTP_400', 'Yêu cầu gửi tới nhà cung cấp AI không tương thích. Vui lòng kiểm tra cấu hình model.'],
    ['PROVIDER_HTTP_405', 'Tài khoản Hive không đủ credit hoặc đang tạm dừng. Vui lòng kiểm tra Organization Credit.'],
  ])('should explain actionable Hive failure %s without exposing the upstream body', (code, message) => {
    expect(friendlyChatError({ code }).message).toBe(message);
  });
  it('should keep friendly client authorization errors and default unknown failures safely', () => {
    expect(friendlyChatError(new ApiError(403, 'Không có quyền truy cập')).message).toBe('Không có quyền truy cập');
    expect(friendlyChatError(null).code).toBe('AI_REQUEST_FAILED');
    expect(friendlyChatError(new ApiError(429, 'raw')).code).toBe('PROVIDER_HTTP_429');
    const failure = new ChatFailureError('PROVIDER_HTTP_502', 'request-2');
    expect(friendlyChatError(failure)).toBe(failure);
    expect(isTerminalChatFailure(new ApiError(409, 'conflict'))).toBe(true);
  });
});
