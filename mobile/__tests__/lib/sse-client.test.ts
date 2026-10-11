import { streamChatResponse } from '../../src/lib/sse-client';
import { fetchAuthorized, fetchJson } from '../../src/lib/api-client';
import { invalidateSession } from '../../src/lib/session-store';
import type { QuestionResponse } from '../../src/features/chat/chat-types';

jest.mock('expo/fetch', () => ({ fetch: jest.fn() }));
jest.mock('../../src/lib/idempotency', () => ({ generateIdempotencyKey: () => '00000000-0000-4000-8000-000000000004' }));
jest.mock('../../src/lib/api-client', () => ({ fetchAuthorized: jest.fn(), fetchJson: jest.fn() }));

const final: QuestionResponse = { operationId: 'operation-1', conversationId: 'conversation-1', messageId: 'message-1',
  decision: 'ANSWER', answer: 'Câu trả lời đã kiểm tra', intent: 'FACTUAL', strategyVersion: 'v1.0', citations: [],
  refusalCode: null, requestId: 'request-1', knowledgeMode: 'STRICT', sections: [] };
function frame(event: string, data: unknown): string { return `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`; }
function stream(chunks: string[]): Response {
  const encoder = new TextEncoder();
  const reader = { read: jest.fn(async () => chunks.length ? { done: false, value: encoder.encode(chunks.shift()) } : { done: true }),
    cancel: jest.fn(), releaseLock: jest.fn() };
  return { ok: true, status: 200, body: { getReader: () => reader } } as unknown as Response;
}
const metadata = { operationId: 'operation-1', conversationId: 'conversation-1', knowledgeMode: 'STRICT', provisional: true };

describe('streamChatResponse', () => {
  beforeEach(() => { jest.clearAllMocks(); invalidateSession(); });
  it('should replace provisional UTF-8 text and finish only after committed final', async () => {
    jest.mocked(fetchAuthorized).mockResolvedValueOnce(stream([
      frame('metadata', metadata), frame('pipeline-step', { stepIndex: 1, stepKey: 'RETRIEVAL', title: 'Truy hồi', detail: 'Đang tìm tài liệu' }),
      frame('token', { delta: 'Tiếng Việt tạm', attemptId: 'first', sequence: 1 }),
      frame('reset', { attemptId: 'first', reason: 'VALIDATION_RETRY' }),
      frame('token', { delta: 'Nội dung mới', attemptId: 'second', sequence: 2 }),
      frame('final', final), frame('done', { operationId: final.operationId, messageId: final.messageId, conversationId: final.conversationId }),
    ]));
    const callbacks = { onToken: jest.fn(), onReset: jest.fn(), onFinal: jest.fn(), onDone: jest.fn() };
    await streamChatResponse('workspace-1', { question: 'Câu hỏi kiểm thử' }, callbacks);
    expect(callbacks.onToken).toHaveBeenNthCalledWith(1, 'Tiếng Việt tạm');
    expect(callbacks.onToken).toHaveBeenNthCalledWith(2, 'Nội dung mới');
    expect(callbacks.onReset).toHaveBeenCalledTimes(1);
    expect(callbacks.onFinal).toHaveBeenCalledWith(final);
    expect(callbacks.onDone).toHaveBeenCalledTimes(1);
    expect(fetchJson).not.toHaveBeenCalled();
  });
  it('should recover the existing operation after EOF without a new ask', async () => {
    jest.mocked(fetchAuthorized).mockResolvedValueOnce(stream([frame('metadata', metadata), frame('token', { delta: 'tạm', attemptId: 'first', sequence: 1 })]));
    jest.mocked(fetchJson).mockResolvedValueOnce({ state: 'COMPLETED', result: final });
    const callbacks = { onFinal: jest.fn(), onDone: jest.fn(), onReset: jest.fn() };
    await streamChatResponse('workspace-1', { question: 'Câu hỏi kiểm thử' }, callbacks);
    expect(fetchAuthorized).toHaveBeenCalledTimes(1);
    expect(fetchJson).toHaveBeenCalledWith('/workspaces/workspace-1/chat-operations/operation-1');
    expect(callbacks.onFinal).toHaveBeenCalledWith(final);
  });
  it('should report forbidden without starting recovery HTTP requests', async () => {
    jest.mocked(fetchAuthorized).mockResolvedValueOnce({ ok: false, status: 403, text: async () => JSON.stringify({ detail: 'Không có quyền truy cập không gian này' }) } as Response);
    const onError = jest.fn();
    await expect(streamChatResponse('workspace-1', { question: 'Câu hỏi' }, { onError })).rejects.toThrow('Không có quyền truy cập không gian này');
    expect(onError).toHaveBeenCalledTimes(1);
    expect(fetchAuthorized).toHaveBeenCalledTimes(1);
    expect(fetchJson).not.toHaveBeenCalled();
  });
  it('should suppress final callbacks when logout changes the generation', async () => {
    jest.mocked(fetchAuthorized).mockImplementationOnce(async () => { invalidateSession(); return stream([frame('final', final)]); });
    const onFinal = jest.fn();
    await expect(streamChatResponse('workspace-1', { question: 'Câu hỏi' }, { onFinal })).rejects.toThrow('Phiên đã thay đổi');
    expect(onFinal).not.toHaveBeenCalled();
  });
});
