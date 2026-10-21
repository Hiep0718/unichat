import { useCallback, useEffect, useRef, useState } from 'react';
import { askWorkspaceQuestionStream, cancelChatOperation, waitForChatOperation } from './chat-api';
import { fetchConversationDetail, fetchConversationMessages } from '../history/conversation-api';
import { getSessionSnapshot, subscribeSession } from '../../lib/session-store';
import type { MessageItem } from './components/chat-message-item';
import type { AskQuestionPayload, QuestionResponse, StreamQuestionCallbacks } from './chat-types';
import type { MessageItem as HistoryMessage } from '../history/conversation-api';

interface PendingAsk {
  readonly key: string; readonly binding: AskQuestionPayload; readonly assistantId: string; readonly generation: number;
  operationId: string | null; controller: AbortController;
}
interface ChatState {
  messages: MessageItem[]; conversationId: string | undefined; title: string | undefined;
  loading: boolean; initialLoading: boolean; error: string | null; older: boolean;
}
const empty = (id?: string): ChatState => ({ messages: [], conversationId: id, title: undefined,
  loading: false, initialLoading: Boolean(id), error: null, older: false });

function historyMessage(message: HistoryMessage): MessageItem {
  const content = message.redacted ? 'Nội dung không còn khả dụng do quyền nguồn đã thay đổi.' : message.content;
  if (message.role === 'USER') return { id: message.id, role: message.role, content, sequence: message.sequence };
  const decision = message.refusalCode === 'CLARIFY_REQUIRED' ? 'CLARIFY' : message.refusalCode ? 'REFUSE' : 'ANSWER';
  return { id: message.id, role: message.role, content, sequence: message.sequence, redacted: message.redacted,
    response: { messageId: message.id, conversationId: message.conversationId, operationId: message.operationId ?? undefined, decision, answer: content,
      intent: message.intent ?? 'FACT', strategyVersion: 'v1.0', citations: message.redacted ? [] : message.citations ?? [],
      refusalCode: message.refusalCode ?? null, requestId: '', knowledgeMode: message.knowledgeMode,
      providerModel: message.redacted ? null : message.providerModel,
      sections: message.redacted ? [] : message.sections, redacted: message.redacted } };
}

/** Drives provisional/final chat state without resubmitting a mutated conversation binding. */
export function useChatSession(workspaceId: string, initialId?: string) {
  const [state, setState] = useState<ChatState>(() => empty(initialId));
  const pending = useRef<PendingAsk | null>(null);
  const history = useRef({ nextPage: 1, snapshot: undefined as number | undefined, loading: false });
  const mounted = useRef(true);
  const current = useRef(state);
  current.current = state;

  const applyFinal = useCallback((answer: QuestionResponse, assistantId: string) => {
    setState((previous) => ({ ...previous, conversationId: answer.conversationId,
      messages: previous.messages.map((message) => message.id === assistantId
        ? { ...message, id: answer.messageId, isStreaming: false, content: answer.redacted ? 'Nội dung không còn khả dụng.' : answer.answer ?? answer.refusalReason ?? '',
          response: answer, redacted: answer.redacted } : message) }));
  }, []);

  const finish = useCallback(() => {
    pending.current = null;
    setState((previous) => ({ ...previous, loading: false }));
  }, []);

  const callbacks = useCallback((request: PendingAsk): StreamQuestionCallbacks => {
    const update = (action: (message: MessageItem) => MessageItem) => {
      if (!mounted.current || pending.current !== request || getSessionSnapshot().generation !== request.generation) return;
      setState((previous) => ({ ...previous, messages: previous.messages.map((message) => message.id === request.assistantId ? action(message) : message) }));
    };
    return {
      onMetadata: (metadata) => { if (!mounted.current || pending.current !== request || getSessionSnapshot().generation !== request.generation) return;
        request.operationId = metadata.operationId ?? null;
        if (metadata.conversationId) setState((previous) => ({ ...previous, conversationId: metadata.conversationId })); },
      onThought: (thought) => update((message) => ({ ...message, thoughts: [...(message.thoughts ?? []), thought] })),
      onToken: (delta) => update((message) => ({ ...message, content: message.content + delta })),
      onReset: () => update((message) => ({ ...message, content: '', response: undefined })),
      onFinal: (result) => { if (mounted.current && pending.current === request && getSessionSnapshot().generation === request.generation) applyFinal(result, request.assistantId); },
      onDone: () => { if (mounted.current && pending.current === request && getSessionSnapshot().generation === request.generation) finish(); },
    };
  }, [applyFinal, finish]);

  const execute = useCallback(async (request: PendingAsk) => {
    try {
      await askWorkspaceQuestionStream(workspaceId, request.binding, callbacks(request),
        { idempotencyKey: request.key, signal: request.controller.signal });
    } catch (error: unknown) {
      if (request.controller.signal.aborted || pending.current !== request || getSessionSnapshot().generation !== request.generation || !mounted.current) return;
      setState((previous) => ({ ...previous, loading: false, error: error instanceof Error ? error.message : 'Không thể hoàn tất câu trả lời',
        messages: previous.messages.map((message) => message.id === request.assistantId ? { ...message, content: '', isStreaming: false } : message) }));
    }
  }, [workspaceId, callbacks]);

  const send = useCallback(async (question: string, expanded = false) => {
    if (pending.current || question.trim().length < 3 || question.trim().length > 2000) return;
    const key = crypto.randomUUID();
    const request: PendingAsk = { key, binding: { question: question.normalize('NFC').trim(),
      conversationId: current.current.conversationId, allowExternalKnowledge: expanded },
      assistantId: `assistant-${key}`, operationId: null, generation: getSessionSnapshot().generation, controller: new AbortController() };
    pending.current = request;
    setState((previous) => ({ ...previous, loading: true, error: null, messages: [...previous.messages,
      { id: `user-${key}`, role: 'USER', content: request.binding.question },
      { id: request.assistantId, role: 'ASSISTANT', content: '', isStreaming: true }] }));
    await execute(request);
  }, [execute]);

  const recover = useCallback(async () => {
    const request = pending.current;
    if (!request || !request.controller.signal.aborted || getSessionSnapshot().generation !== request.generation) return;
    request.controller = new AbortController();
    if (!request.operationId) { await execute(request); return; }
    try {
      const result = await waitForChatOperation(workspaceId, request.operationId, request.controller.signal);
      if (pending.current !== request || getSessionSnapshot().generation !== request.generation || !mounted.current) return;
      applyFinal(result, request.assistantId); finish();
    } catch (error: unknown) {
      if (pending.current === request && request.generation === getSessionSnapshot().generation && !request.controller.signal.aborted && mounted.current) {
        setState((previous) => ({ ...previous, loading: false, error: error instanceof Error ? error.message : 'Không thể khôi phục kết quả' }));
      }
    }
  }, [workspaceId, execute, applyFinal, finish]);

  useEffect(() => {
    mounted.current = true;
    const visibility = () => { if (document.hidden) pending.current?.controller.abort(); else void recover(); };
    const identity = { generation: getSessionSnapshot().generation };
    const unsubscribe = subscribeSession(() => {
      const generation = getSessionSnapshot().generation;
      if (identity.generation === generation) return;
      identity.generation = generation;
      const request = pending.current;
      request?.controller.abort(); pending.current = null; setState(empty());
    });
    document.addEventListener('visibilitychange', visibility);
    return () => { mounted.current = false; pending.current?.controller.abort(); unsubscribe(); document.removeEventListener('visibilitychange', visibility); };
  }, [recover]);

  useEffect(() => {
    const request = { cancelled: false, generation: getSessionSnapshot().generation };
    pending.current?.controller.abort(); pending.current = null;
    setState(empty(initialId));
    if (!initialId) return;
    void Promise.all([fetchConversationDetail(workspaceId, initialId), fetchConversationMessages(workspaceId, initialId)])
      .then(([detail, page]) => {
        if (request.cancelled || request.generation !== getSessionSnapshot().generation) return;
        history.current = { nextPage: 1, snapshot: page.snapshotSequence, loading: false };
        setState({ ...empty(initialId), initialLoading: false, title: detail.title,
          messages: page.content.map(historyMessage), older: page.totalPages > 1 });
      }).catch((error: unknown) => {
        if (!request.cancelled && request.generation === getSessionSnapshot().generation) setState((previous) => ({ ...previous, initialLoading: false, error: error instanceof Error ? error.message : 'Không thể tải lịch sử' }));
      });
    return () => { request.cancelled = true; };
  }, [workspaceId, initialId]);

  const loadOlder = useCallback(async () => {
    const id = current.current.conversationId;
    if (!id || !current.current.older || history.current.loading) return;
    history.current.loading = true;
    const generation = getSessionSnapshot().generation;
    try {
      const page = await fetchConversationMessages(workspaceId, id, history.current.nextPage, 20, history.current.snapshot);
      if (generation !== getSessionSnapshot().generation || current.current.conversationId !== id || !mounted.current) return;
      history.current.nextPage += 1;
      setState((previous) => ({ ...previous, messages: [...page.content.map(historyMessage), ...previous.messages],
        older: history.current.nextPage < page.totalPages }));
    } catch (error: unknown) {
      if (generation === getSessionSnapshot().generation && mounted.current) setState((previous) => ({ ...previous, error: error instanceof Error ? error.message : 'Không thể tải tin nhắn cũ' }));
    } finally { history.current.loading = false; }
  }, [workspaceId]);

  const cancel = useCallback(async () => {
    const request = pending.current;
    if (!request?.operationId) return;
    try {
      const result = await cancelChatOperation(workspaceId, request.operationId);
      if (pending.current !== request || getSessionSnapshot().generation !== request.generation || !mounted.current) return;
      request.controller.abort();
      if (result.state === 'COMPLETED' && result.result) applyFinal(result.result, request.assistantId);
      else setState((previous) => ({ ...previous, messages: previous.messages.filter((message) => message.id !== request.assistantId) }));
      finish();
    } catch (error: unknown) {
      if (getSessionSnapshot().generation === request.generation) setState((previous) => ({ ...previous, error: error instanceof Error ? error.message : 'Không thể dừng yêu cầu' }));
    }
  }, [workspaceId, applyFinal, finish]);
  const retry = useCallback(async () => {
    const request = pending.current;
    if (!request || current.current.loading || request.generation !== getSessionSnapshot().generation) return;
    request.controller = new AbortController();
    setState((previous) => ({ ...previous, loading: true, error: null,
      messages: previous.messages.map((message) => message.id === request.assistantId ? { ...message, isStreaming: true, content: '' } : message) }));
    await execute(request);
  }, [execute]);
  const reset = useCallback(() => { pending.current?.controller.abort(); pending.current = null; setState(empty()); }, []);
  return { ...state, send, cancel, loadOlder, reset, retry, canRetry: !state.loading && pending.current !== null };
}
