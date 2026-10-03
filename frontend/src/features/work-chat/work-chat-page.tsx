/**
 * Work Chat — one-to-one messaging with people who share a group.
 * Route: /work-chat
 */
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';

import { Icon } from '../../components/icon';
import { ContactPicker } from './components/contact-picker';
import { ConversationList } from './components/conversation-list';
import { MessageThread } from './components/message-thread';
import { useWorkChatSocket } from './use-work-chat-socket';
import {
  fetchConversations,
  fetchMessages,
  markConversationRead,
  openConversation,
  sendMessage,
} from './work-chat-api';
import type { Conversation, DirectMessage } from './work-chat-api';
import './work-chat-page.css';

export function WorkChatPage() {
  // A profile's "Nhắn tin" button opens the conversation it just created, so
  // the page starts on that one rather than on nothing.
  const [searchParams] = useSearchParams();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeId, setActiveId] = useState<string | null>(
    searchParams.get('conversation'));
  const [messages, setMessages] = useState<DirectMessage[]>([]);
  const [showPicker, setShowPicker] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const active = useMemo(
    () => conversations.find((conversation) => conversation.id === activeId) ?? null,
    [conversations, activeId],
  );

  /** Refreshes the list. Called from handlers and callbacks, never as an
   *  effect body, so it never sets state during a render pass. */
  const loadConversations = useCallback(
    () => fetchConversations()
      .then(setConversations)
      .catch(() => setError('Không tải được danh sách trò chuyện.')),
    []);

  useEffect(() => {
    let cancelled = false;
    fetchConversations()
      .then((list) => {
        if (!cancelled) setConversations(list);
      })
      .catch(() => {
        if (!cancelled) setError('Không tải được danh sách trò chuyện.');
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // A pushed message belongs to the open thread or to another one; either way
  // the list needs refreshing so its preview and unread badge stay true.
  const onPushed = useCallback((message: DirectMessage) => {
    setMessages((previous) =>
      message.conversationId === activeId && !previous.some((m) => m.id === message.id)
        ? [message, ...previous]
        : previous);
    void loadConversations();
  }, [activeId, loadConversations]);

  const connected = useWorkChatSocket(onPushed);

  useEffect(() => {
    if (!activeId) {
      return;
    }
    fetchMessages(activeId)
      .then(setMessages)
      .catch(() => setError('Không tải được tin nhắn.'));

    markConversationRead(activeId)
      .then(loadConversations)
      .catch(() => {
        // Read receipts are supplementary; the thread still works without them.
      });
  }, [activeId, loadConversations]);

  const handleSend = async (body: string) => {
    if (!activeId) {
      return;
    }
    const sent = await sendMessage(activeId, body);
    setMessages((previous) => [sent, ...previous]);
    void loadConversations();
  };

  const handlePick = async (userId: string) => {
    setShowPicker(false);
    try {
      const conversation = await openConversation(userId);
      await loadConversations();
      setActiveId(conversation.id);
    } catch {
      setError('Không mở được cuộc trò chuyện.');
    }
  };

  return (
    <div className="work-chat">
      <aside className="work-chat__sidebar">
        <header className="work-chat__sidebar-header">
          <h1 className="work-chat__title">Tin nhắn</h1>
          <button
            type="button"
            className="work-chat__new"
            onClick={() => setShowPicker(true)}
          >
            <Icon name="add_comment" size={18} />
            <span className="work-chat__new-label">Cuộc trò chuyện mới</span>
          </button>
        </header>

        {!connected && (
          <p className="work-chat__offline" role="status">
            <Icon name="cloud_off" size={14} />
            Đang kết nối lại — tin nhắn vẫn gửi được.
          </p>
        )}

        <ConversationList
          conversations={conversations}
          activeId={activeId}
          onSelect={setActiveId}
        />
      </aside>

      <main className="work-chat__main">
        {error && (
          <p className="work-chat__error" role="alert">
            <Icon name="error_outline" size={16} /> {error}
          </p>
        )}

        {active ? (
          <MessageThread
            conversation={active}
            messages={messages}
            onSend={handleSend}
          />
        ) : (
          <div className="work-chat__empty">
            <Icon name="forum" size={40} />
            <p>Chọn một cuộc trò chuyện, hoặc bắt đầu cuộc mới.</p>
          </div>
        )}
      </main>

      {showPicker && (
        <ContactPicker onPick={handlePick} onClose={() => setShowPicker(false)} />
      )}
    </div>
  );
}

export default WorkChatPage;
