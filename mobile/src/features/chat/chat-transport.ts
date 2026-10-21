import { z } from 'zod';
import { fetch as expoFetch } from 'expo/fetch';
import { generateIdempotencyKey } from '../../lib/idempotency';
import { fetchAuthorized, fetchJson } from '../../lib/api-client';
import { readApiResponse } from '../../lib/api-error';
import { getSessionSnapshot, assertSessionGeneration } from '../../lib/session-store';
import { SseFrameParser } from '../../lib/sse-protocol';
import { ChatEventReceiver } from './chat-events';
import { friendlyChatError, isTerminalChatFailure } from './chat-failures';
import type { AskQuestionPayload, ChatOperation, ChatRequestOptions, QuestionResponse, StreamQuestionCallbacks } from './chat-types';
export type * from './chat-types';

const questionSchema = z.object({ question: z.string().min(3).max(2000),
  conversationId: z.string().uuid().optional(), allowExternalKnowledge: z.boolean().default(false) });
const keySchema = z.string().uuid();

/** Reads an owner-only operation after an interrupted transport. */
export function fetchChatOperation(workspaceId: string, operationId: string): Promise<ChatOperation> {
  return fetchJson(`/workspaces/${workspaceId}/chat-operations/${operationId}`);
}
/** Requests explicit server cancellation, unlike detaching a subscriber. */
export function cancelChatOperation(workspaceId: string, operationId: string): Promise<ChatOperation> {
  return fetchJson(`/workspaces/${workspaceId}/chat-operations/${operationId}/cancel`, { method: 'POST' });
}

function wait(milliseconds: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) { reject(new DOMException('Đã ngắt theo dõi', 'AbortError')); return; }
    const cleanup = () => signal?.removeEventListener('abort', abort);
    const timer = setTimeout(() => { cleanup(); resolve(); }, milliseconds);
    const abort = () => { clearTimeout(timer); cleanup(); reject(new DOMException('Đã ngắt theo dõi', 'AbortError')); };
    signal?.addEventListener('abort', abort, { once: true });
  });
}

/** Polls the same operation within the server deadline; never starts a new ask. */
export async function waitForChatOperation(workspaceId: string, operationId: string, signal?: AbortSignal): Promise<QuestionResponse> {
  const deadline = Date.now() + 125_000;
  const generation = getSessionSnapshot().generation;
  while (Date.now() < deadline) {
    if (signal?.aborted) throw new DOMException('Đã ngắt theo dõi', 'AbortError');
    const operation = await fetchChatOperation(workspaceId, operationId);
    assertSessionGeneration(generation);
    if (operation.state === 'COMPLETED' && operation.result) return operation.result;
    if (operation.state !== 'RUNNING') throw friendlyChatError({ code: operation.errorCode });
    await wait(2_000, signal);
  }
  throw new Error('Chưa nhận được kết quả. Vui lòng kiểm tra lại lịch sử hội thoại.');
}

/** Submits or recovers the immutable original binding under a single UUID key. */
export async function askWorkspaceQuestion(workspaceId: string, payload: AskQuestionPayload, options: ChatRequestOptions = {}): Promise<QuestionResponse> {
  const key = keySchema.parse(options.idempotencyKey ?? generateIdempotencyKey());
  const body = questionSchema.parse(payload);
  const response = await fetchAuthorized(`/workspaces/${workspaceId}/questions`, {
    method: 'POST', headers: { 'Idempotency-Key': key }, body: JSON.stringify(body), ...(options.signal ? { signal: options.signal } : {}),
  });
  const result = await readApiResponse<QuestionResponse | ChatOperation>(response).catch((failure: unknown) => { throw friendlyChatError(failure); });
  if (response.status === 202) return waitForChatOperation(workspaceId, (result as ChatOperation).operationId, options.signal);
  return result as QuestionResponse;
}

async function consumeStream(response: Response, callbacks: StreamQuestionCallbacks, generation: number): Promise<void> {
  if (!response.body) throw new Error('Máy chủ không trả luồng dữ liệu');
  const receiver = new ChatEventReceiver(callbacks);
  const parser = new SseFrameParser((frame) => { assertSessionGeneration(generation); receiver.receive(frame); });
  const reader = response.body.getReader();
  try {
    while (true) {
      const chunk = await reader.read();
      assertSessionGeneration(generation);
      if (chunk.done) break;
      parser.push(chunk.value);
    }
    parser.finish();
    receiver.finish();
  } finally { await reader.cancel(); reader.releaseLock(); }
}

function deliverResult(result: QuestionResponse, callbacks: StreamQuestionCallbacks): void {
  callbacks.onReset?.();
  callbacks.onFinal?.(result);
  callbacks.onDone?.({ messageId: result.messageId, conversationId: result.conversationId, operationId: result.operationId });
}

/** Streams provisional text, replaces it with committed final and recovers the same key on interruption. */
export async function streamChatResponse(workspaceId: string, payload: AskQuestionPayload,
  callbacks: StreamQuestionCallbacks, options: ChatRequestOptions = {}): Promise<void> {
  const key = keySchema.parse(options.idempotencyKey ?? generateIdempotencyKey());
  const binding = questionSchema.parse(payload);
  const generation = getSessionSnapshot().generation;
  const operation = { id: null as string | null };
  const guarded: StreamQuestionCallbacks = { ...callbacks, onMetadata: (metadata) => {
    operation.id = metadata.operationId ?? null; callbacks.onMetadata?.(metadata);
  } };
  try {
    const response = await fetchAuthorized(`/workspaces/${workspaceId}/questions/stream`, {
      method: 'POST', headers: { 'Idempotency-Key': key }, body: JSON.stringify(binding),
      ...(options.signal ? { signal: options.signal } : {}),
    }, expoFetch as unknown as typeof fetch);
    if (!response.ok) await readApiResponse(response);
    if (response.status === 202) {
      const status = await readApiResponse<ChatOperation>(response);
      operation.id = status.operationId;
      deliverResult(await waitForChatOperation(workspaceId, status.operationId, options.signal), guarded);
      return;
    }
    await consumeStream(response, guarded, generation);
  } catch (error: unknown) {
    assertSessionGeneration(generation);
    if (options.signal?.aborted) throw error;
    if (isTerminalChatFailure(error)) { const failure = friendlyChatError(error); callbacks.onReset?.(); callbacks.onError?.(failure); throw failure; }
    callbacks.onReset?.();
    try {
      const result = operation.id ? await waitForChatOperation(workspaceId, operation.id, options.signal)
        : await askWorkspaceQuestion(workspaceId, binding, { idempotencyKey: key, ...options });
      assertSessionGeneration(generation);
      deliverResult(result, guarded);
    } catch (recoveryError: unknown) {
      const failure = friendlyChatError(recoveryError);
      callbacks.onError?.(failure);
      throw failure;
    }
  }
}
