import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fetchAuthorized, fetchJson } from '../../lib/api-client';
import { invalidateSession } from '../../lib/session-store';
import { askWorkspaceQuestion, askWorkspaceQuestionStream } from './chat-api';
import { ChatFailureError } from './chat-failures';
import type { QuestionResponse } from './chat-types';

vi.mock('../../lib/api-client', () => ({ fetchAuthorized: vi.fn(), fetchJson: vi.fn() }));
const result: QuestionResponse = { operationId: 'operation-1', conversationId: 'conversation-1', messageId: 'message-1',
  decision: 'ANSWER', answer: 'Câu trả lời đã kiểm tra', intent: 'FACT', strategyVersion: 'v1', citations: [],
  refusalCode: null, requestId: 'request-1', knowledgeMode: 'STRICT', sections: [], providerModel: 'deepseek-ai/deepseek-v4.1-flash' };
const identity = { idempotencyKey: '00000000-0000-4000-8000-000000000004' };
function frame(event: string, data: unknown): string { return `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`; }
function stream(chunks: string[]): Response {
  const reader = { read: vi.fn(async () => chunks.length ? { done: false, value: new TextEncoder().encode(chunks.shift()) } : { done: true }),
    cancel: vi.fn(), releaseLock: vi.fn() };
  return { ok: true, status: 200, body: { getReader: () => reader } } as unknown as Response;
}
function failedResponse(code: string): Response {
  return { ok: false, status: 503, text: async () => JSON.stringify({ errorCode: code, requestId: 'request-1', detail: 'raw provider body' }) } as Response;
}
describe('ChatApi', () => {
  beforeEach(() => { vi.clearAllMocks(); invalidateSession(); });
  it.each(['AI_MAINTENANCE', 'PROVIDER_HTTP_401', 'PROVIDER_PROTOCOL_ERROR'])('should present %s without polling or replaying an explicit HTTP failure', async (code) => {
    vi.mocked(fetchAuthorized).mockResolvedValueOnce(failedResponse(code));
    const callbacks = { onError: vi.fn(), onReset: vi.fn(), onFinal: vi.fn(), onDone: vi.fn() };
    await expect(askWorkspaceQuestionStream('workspace-1', { question: 'Câu hỏi' }, callbacks, identity)).rejects.toMatchObject({ code, requestId: 'request-1' });
    expect(callbacks.onError).toHaveBeenCalledWith(expect.any(ChatFailureError));
    expect(callbacks.onReset).toHaveBeenCalledOnce();
    expect(callbacks.onFinal).not.toHaveBeenCalled();
    expect(callbacks.onDone).not.toHaveBeenCalled();
    expect(fetchAuthorized).toHaveBeenCalledOnce();
    expect(fetchJson).not.toHaveBeenCalled();
  });
  it('should clear provisional text on reset and preserve the terminal SSE failure identity', async () => {
    vi.mocked(fetchAuthorized).mockResolvedValueOnce(stream([
      frame('token', { delta: 'Tạm', attemptId: 'attempt-1', sequence: 1 }),
      frame('reset', { attemptId: 'attempt-1' }), frame('error', { code: 'PROVIDER_TIMEOUT', requestId: 'request-1' }),
    ]));
    const callbacks = { onToken: vi.fn(), onReset: vi.fn(), onFinal: vi.fn(), onDone: vi.fn() };
    await expect(askWorkspaceQuestionStream('workspace-1', { question: 'Câu hỏi' }, callbacks, identity)).rejects.toMatchObject({ code: 'PROVIDER_TIMEOUT', requestId: 'request-1' });
    expect(callbacks.onToken).toHaveBeenCalledWith('Tạm');
    expect(callbacks.onReset).toHaveBeenCalled();
    expect(callbacks.onFinal).not.toHaveBeenCalled();
    expect(callbacks.onDone).not.toHaveBeenCalled();
    expect(fetchJson).not.toHaveBeenCalled();
  });
  it('should recover the same admitted operation after EOF without another ask', async () => {
    vi.mocked(fetchAuthorized).mockResolvedValueOnce(stream([frame('metadata', {
      operationId: 'operation-1', conversationId: 'conversation-1', knowledgeMode: 'STRICT', provisional: true,
    })]));
    vi.mocked(fetchJson).mockResolvedValueOnce({ state: 'COMPLETED', result });
    const callbacks = { onFinal: vi.fn(), onDone: vi.fn() };
    await askWorkspaceQuestionStream('workspace-1', { question: 'Câu hỏi' }, callbacks, identity);
    expect(fetchJson).toHaveBeenCalledWith('/workspaces/workspace-1/chat-operations/operation-1');
    expect(fetchAuthorized).toHaveBeenCalledOnce();
    expect(callbacks.onFinal).toHaveBeenCalledWith(result);
    expect(callbacks.onDone).toHaveBeenCalledOnce();
  });
  it('should deliver the actual persisted model after final and done', async () => {
    vi.mocked(fetchAuthorized).mockResolvedValueOnce(stream([frame('final', result),
      frame('done', { operationId: result.operationId, messageId: result.messageId })]));
    const onFinal = vi.fn();
    await askWorkspaceQuestionStream('workspace-1', { question: 'Câu hỏi' }, { onFinal }, identity);
    expect(onFinal).toHaveBeenCalledWith(result);
    expect(fetchJson).not.toHaveBeenCalled();
  });
  it('should map maintenance on the non-streaming endpoint to the same friendly failure', async () => {
    vi.mocked(fetchAuthorized).mockResolvedValueOnce(failedResponse('AI_MAINTENANCE'));
    await expect(askWorkspaceQuestion('workspace-1', { question: 'Câu hỏi' }, identity)).rejects.toMatchObject({
      code: 'AI_MAINTENANCE', message: 'Dịch vụ AI đang bảo trì. Vui lòng thử lại sau ít phút.',
    });
  });
});
