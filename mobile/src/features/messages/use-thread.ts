/**
 * Trạng thái của một cuộc trò chuyện đang mở: tin nhắn, cuộc gọi, gửi tin và
 * nhận tin tức thì.
 */
import { useCallback, useEffect, useRef, useState } from 'react';

import { useRealtimeSubscription } from '../realtime/realtime-provider';
import { MESSAGE_PAGE_SIZE, messagesApi } from './messages-api';
import { mergeMessages } from './thread-timeline';
import { MESSAGES_DESTINATION, useInvalidateConversations } from './use-conversations';

import type { CallHistoryEntry, DirectMessage } from './messages-api';

export type ThreadStatus = 'loading' | 'ready' | 'error';

export interface ThreadState {
  readonly status: ThreadStatus;
  /** Mới nhất trước. */
  readonly messages: readonly DirectMessage[];
  readonly calls: readonly CallHistoryEntry[];
  readonly hasOlder: boolean;
  readonly loadingOlder: boolean;
  readonly sending: boolean;
  readonly reload: () => Promise<void>;
  readonly loadOlder: () => Promise<void>;
  /** Ném lỗi khi gửi hỏng, để ô soạn giữ lại nội dung. */
  readonly send: (body: string) => Promise<void>;
}

function parseFrame(body: string): DirectMessage | null {
  try {
    return JSON.parse(body) as DirectMessage;
  } catch {
    // Frame không đọc được thì bỏ qua: tin vẫn nằm trên máy chủ.
    return null;
  }
}

/** Quản lý một cuộc trò chuyện theo id của nó. */
export function useThread(conversationId: string): ThreadState {
  const [status, setStatus] = useState<ThreadStatus>('loading');
  const [messages, setMessages] = useState<DirectMessage[]>([]);
  const [calls, setCalls] = useState<CallHistoryEntry[]>([]);
  const [hasOlder, setHasOlder] = useState(false);
  const [loadingOlder, setLoadingOlder] = useState(false);
  const [sending, setSending] = useState(false);
  const pageRef = useRef(0);
  const invalidateList = useInvalidateConversations();

  // Dấu đã đọc là phụ: hỏng thì chỉ huy hiệu chưa đọc còn đó tới lần mở sau,
  // nên lỗi của nó không được chặn việc hiện tin. Hàm gọi tự quyết bỏ qua.
  const markRead = useCallback(async () => {
    await messagesApi.markRead(conversationId);
    invalidateList();
  }, [conversationId, invalidateList]);

  const reload = useCallback(async () => {
    setStatus('loading');
    try {
      const [firstPage, history] = await Promise.all([
        messagesApi.fetchMessages(conversationId, 0),
        messagesApi.fetchCallHistory(conversationId),
      ]);
      pageRef.current = 0;
      setMessages(mergeMessages([], firstPage));
      setCalls(history);
      setHasOlder(firstPage.length === MESSAGE_PAGE_SIZE);
      setStatus('ready');
    } catch {
      setStatus('error');
      return;
    }
    await markRead().catch(() => undefined);
  }, [conversationId, markRead]);

  const loadOlder = useCallback(async () => {
    if (!hasOlder || loadingOlder) return;
    setLoadingOlder(true);
    try {
      const page = await messagesApi.fetchMessages(conversationId, pageRef.current + 1);
      pageRef.current += 1;
      setMessages((current) => mergeMessages(current, page));
      setHasOlder(page.length === MESSAGE_PAGE_SIZE);
    } finally {
      setLoadingOlder(false);
    }
  }, [conversationId, hasOlder, loadingOlder]);

  const send = useCallback(async (body: string) => {
    setSending(true);
    try {
      const sent = await messagesApi.sendMessage(conversationId, body);
      setMessages((current) => mergeMessages(current, [sent]));
      invalidateList();
    } finally {
      setSending(false);
    }
  }, [conversationId, invalidateList]);

  const onFrame = useCallback((body: string) => {
    const message = parseFrame(body);
    if (!message || message.conversationId !== conversationId) return;
    setMessages((current) => mergeMessages(current, [message]));
    if (!message.mine) void markRead().catch(() => undefined);
  }, [conversationId, markRead]);

  useRealtimeSubscription(MESSAGES_DESTINATION, onFrame);

  useEffect(() => {
    void reload();
  }, [reload]);

  return { status, messages, calls, hasOlder, loadingOlder, sending, reload, loadOlder, send };
}
