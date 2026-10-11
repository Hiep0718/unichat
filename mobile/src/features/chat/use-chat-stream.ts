import { useState, useRef, useCallback, useEffect } from 'react';
import { AppState } from 'react-native';
import { streamChatResponse } from '../../lib/sse-client';
import { getSessionSnapshot, subscribeSession } from '../../lib/session-store';
import { generateIdempotencyKey } from '../../lib/idempotency';
import { cancelChatOperation, waitForChatOperation } from './chat-transport';
import { chatApi } from './chat-api';
import type { MessageItem } from '../../types/api';
import type { AskQuestionPayload, CitationItem, QuestionResponse, SseThoughtPayload, StreamQuestionCallbacks } from './chat-types';

interface Options { workspaceId: string; conversationId?: string; onConversationCreated?: (id: string) => void }
interface PendingAsk {
  readonly key: string; readonly binding: AskQuestionPayload; readonly generation: number;
  operationId: string | null; controller: AbortController;
}

/** Runs one immutable operation through provisional, committed, detached and cancelled states. */
export function useChatStream({ workspaceId, conversationId: initialId, onConversationCreated }: Options) {
  const [conversationId, setConversationId] = useState<string | null>(initialId ?? null);
  const [messages, setMessages] = useState<MessageItem[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [isThinking, setIsThinking] = useState(false);
  const [thoughtSteps, setThoughtSteps] = useState<SseThoughtPayload[]>([]);
  const [streamingAnswer, setStreamingAnswer] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loadingHistory, setLoadingHistory] = useState(Boolean(initialId));
  const [hasOlder, setHasOlder] = useState(false);
  const pending = useRef<PendingAsk | null>(null);
  const mounted = useRef(true);
  const activeId = useRef(initialId ?? null);
  const history = useRef({ page: 1, snapshot: undefined as number | undefined, loading: false });
  const answer = useRef('');
  const current = useCallback((request: PendingAsk) => mounted.current && pending.current === request && request.generation === getSessionSnapshot().generation, []);
  const bindConversation = useCallback((id: string) => {
    const created = !activeId.current;
    activeId.current = id; setConversationId(id);
    if (created) onConversationCreated?.(id);
  }, [onConversationCreated]);
  const clearProvisional = useCallback(() => {
    answer.current = ''; setStreamingAnswer(''); setIsThinking(false);
  }, []);
  const final = useCallback((result: QuestionResponse) => {
    bindConversation(result.conversationId);
    const content = result.redacted ? 'Nội dung không còn khả dụng do quyền nguồn đã thay đổi.' : result.answer ?? result.refusalReason ?? '';
    setMessages((previous) => [...previous.filter((message) => message.id !== result.messageId), {
      id: result.messageId, conversationId: result.conversationId, sender: 'ASSISTANT', content,
      operationId: result.operationId ?? null,
      citations: result.redacted ? [] : result.citations, sections: result.redacted ? [] : result.sections ?? [],
      knowledgeMode: result.knowledgeMode ?? 'STRICT', redacted: result.redacted ?? false,
      refusalCode: result.refusalCode, createdAt: new Date().toISOString(),
    }]); clearProvisional();
  }, [bindConversation, clearProvisional]);
  const finish = useCallback(() => { pending.current = null; setIsStreaming(false); setIsThinking(false); }, []);
  const callbacks = useCallback((request: PendingAsk): StreamQuestionCallbacks => ({
    onMetadata: (metadata) => { if (!current(request)) return; request.operationId = metadata.operationId ?? null;
      if (metadata.conversationId) bindConversation(metadata.conversationId); },
    onThought: (step) => { if (current(request)) setThoughtSteps((previous) => [...previous, step]); },
    onToken: (delta) => { if (!current(request)) return; answer.current += delta; setStreamingAnswer(answer.current); setIsThinking(false); },
    onReset: () => { if (current(request)) clearProvisional(); },
    onFinal: (result) => { if (current(request)) final(result); },
    onDone: () => { if (current(request)) finish(); },
  }), [bindConversation, clearProvisional, final, finish, current]);
  const execute = useCallback(async (request: PendingAsk) => {
    try { await streamChatResponse(workspaceId, request.binding, callbacks(request), { idempotencyKey: request.key, signal: request.controller.signal }); }
    catch (failure: unknown) {
      if (!current(request) || request.controller.signal.aborted) return;
      clearProvisional(); setIsStreaming(false); setError(failure instanceof Error ? failure.message : 'Không thể hoàn tất yêu cầu');
    }
  }, [workspaceId, callbacks, clearProvisional, current]);
  const sendMessage = useCallback(async (text: string, expanded = false) => {
    const question = text.normalize('NFC').trim();
    if (pending.current || question.length < 3 || question.length > 2000) return;
    const request: PendingAsk = { key: generateIdempotencyKey(), generation: getSessionSnapshot().generation,
      binding: { question, ...(activeId.current ? { conversationId: activeId.current } : {}), allowExternalKnowledge: expanded },
      operationId: null, controller: new AbortController() };
    pending.current = request;
    setMessages((previous) => [...previous, { id: `user-${request.key}`, conversationId: activeId.current ?? '',
      sender: 'USER', content: question, createdAt: new Date().toISOString() }]);
    clearProvisional(); setIsStreaming(true); setIsThinking(true); setThoughtSteps([]); setError(null);
    await execute(request);
  }, [execute, clearProvisional]);
  const retry = useCallback(async () => {
    const request = pending.current;
    if (!request || isStreaming || !current(request)) return;
    request.controller = new AbortController(); setIsStreaming(true); setError(null); await execute(request);
  }, [execute, isStreaming, current]);
  const resume = useCallback(async () => {
    const request = pending.current;
    if (!request || !request.controller.signal.aborted || !current(request)) return;
    request.controller = new AbortController();
    if (!request.operationId) { await execute(request); return; }
    try { const result = await waitForChatOperation(workspaceId, request.operationId, request.controller.signal);
      if (current(request)) { final(result); finish(); } }
    catch (failure: unknown) { if (current(request) && !request.controller.signal.aborted) {
      clearProvisional(); setIsStreaming(false); setError(failure instanceof Error ? failure.message : 'Không thể khôi phục kết quả'); } }
  }, [workspaceId, execute, final, finish, clearProvisional, current]);
  useEffect(() => {
    mounted.current = true;
    const identity = { generation: getSessionSnapshot().generation };
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') void resume(); else pending.current?.controller.abort();
    });
    const unsubscribe = subscribeSession(() => {
      if (identity.generation === getSessionSnapshot().generation) return;
      identity.generation = getSessionSnapshot().generation;
      pending.current?.controller.abort(); pending.current = null; activeId.current = null;
      setMessages([]); setConversationId(null); clearProvisional(); setIsStreaming(false); setError(null);
    });
    return () => { mounted.current = false; pending.current?.controller.abort(); subscription.remove(); unsubscribe(); };
  }, [resume, clearProvisional]);
  useEffect(() => {
    const request = { active: true, generation: getSessionSnapshot().generation };
    pending.current?.controller.abort(); pending.current = null;
    activeId.current = initialId ?? null; setConversationId(initialId ?? null); setMessages([]); clearProvisional(); setIsStreaming(false);
    setLoadingHistory(Boolean(initialId)); setHasOlder(false);
    if (!initialId) return;
    void chatApi.getMessages(workspaceId, initialId).then((page) => {
      if (!request.active || request.generation !== getSessionSnapshot().generation) return;
      history.current = { page: 1, snapshot: page.snapshotSequence, loading: false };
      setMessages(page.content); setHasOlder(page.totalPages > 1); setLoadingHistory(false);
    }).catch((failure: unknown) => { if (request.active && request.generation === getSessionSnapshot().generation) {
      setError(failure instanceof Error ? failure.message : 'Không tải được lịch sử'); setLoadingHistory(false); } });
    return () => { request.active = false; };
  }, [workspaceId, initialId, clearProvisional]);
  const loadOlder = useCallback(async () => {
    const id = activeId.current;
    if (!id || !hasOlder || history.current.loading) return;
    const generation = getSessionSnapshot().generation; history.current.loading = true;
    try { const page = await chatApi.getMessages(workspaceId, id, history.current.page, 20, history.current.snapshot);
      if (!mounted.current || generation !== getSessionSnapshot().generation || id !== activeId.current) return;
      history.current.page += 1; setMessages((previous) => [...page.content, ...previous]); setHasOlder(history.current.page < page.totalPages); }
    catch (failure: unknown) { if (generation === getSessionSnapshot().generation) setError(failure instanceof Error ? failure.message : 'Không tải được tin nhắn cũ'); }
    finally { history.current.loading = false; }
  }, [workspaceId, hasOlder]);
  const cancel = useCallback(async () => {
    const request = pending.current;
    if (!request?.operationId) return;
    try { const operation = await cancelChatOperation(workspaceId, request.operationId);
      if (!current(request)) return;
      request.controller.abort();
      if (operation.state === 'COMPLETED' && operation.result) final(operation.result); else clearProvisional();
      finish(); }
    catch (failure: unknown) { if (current(request)) setError(failure instanceof Error ? failure.message : 'Không thể dừng yêu cầu'); }
  }, [workspaceId, final, clearProvisional, finish, current]);
  const resetChat = useCallback(() => { pending.current?.controller.abort(); pending.current = null; activeId.current = null;
    setConversationId(null); setMessages([]); clearProvisional(); setError(null); setThoughtSteps([]); setIsStreaming(false); }, [clearProvisional]);
  return { conversationId, setConversationId, messages, setMessages, isStreaming, isThinking, thoughtSteps, streamingAnswer,
    currentCitations: [] as CitationItem[], error, sendMessage, resetChat, cancel, retry, canRetry: !isStreaming && pending.current !== null,
    loadingHistory, hasOlder, loadOlder };
}
