/**
 * Past conversations with this group's assistant, beside the current one.
 *
 * A drawer rather than the page it used to be. Conversation history is the
 * assistant's own history, so reaching it meant leaving the assistant, and
 * going back to the thread you were reading meant finding it again. It also
 * sat in two menus at once — the group's "..." and the left rail — under the
 * same name, which made it look like two different places.
 */
import { useEffect, useState } from 'react';

import { Icon } from '../../../components/icon';
import { fetchWorkspaceConversations } from '../../history/conversation-api';

import './chat-history-panel.css';

import type { ConversationItem } from '../../history/conversation-api';

interface ChatHistoryPanelProps {
  readonly workspaceId: string;
  /** Highlighted in the list; null while a new conversation is unsaved. */
  readonly currentId: string | null;
  readonly onOpen: (conversationId: string) => void;
  readonly onNew: () => void;
  readonly onClose: () => void;
}

/** Day and month, or the time when it was today. */
function formatWhen(iso: string): string {
  const at = new Date(iso);
  const today = new Date();
  const sameDay =
    at.getDate() === today.getDate() &&
    at.getMonth() === today.getMonth() &&
    at.getFullYear() === today.getFullYear();

  return sameDay
    ? at.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })
    : at.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' });
}

export function ChatHistoryPanel({
  workspaceId,
  currentId,
  onOpen,
  onNew,
  onClose,
}: ChatHistoryPanelProps) {
  const [conversations, setConversations] = useState<readonly ConversationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (!workspaceId) return undefined;
    let active = true;
    setLoading(true);
    setFailed(false);

    fetchWorkspaceConversations(workspaceId)
      .then((page) => {
        if (active) setConversations(page.content ?? []);
      })
      .catch(() => {
        if (active) setFailed(true);
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [workspaceId]);

  return (
    <aside className="chat-history" aria-label="Lịch sử hội thoại">
      <header className="chat-history__head">
        <h2 className="chat-history__title">Lịch sử hội thoại</h2>
        <button
          type="button"
          className="chat-history__icon-btn"
          onClick={onClose}
          aria-label="Đóng lịch sử"
        >
          <Icon name="close" size={18} />
        </button>
      </header>

      <button type="button" className="chat-history__new" onClick={onNew}>
        <Icon name="add" size={17} />
        Cuộc trò chuyện mới
      </button>

      {loading && <p className="chat-history__note">Đang tải…</p>}
      {failed && <p className="chat-history__note">Không tải được lịch sử.</p>}
      {!loading && !failed && conversations.length === 0 && (
        <p className="chat-history__note">Chưa có cuộc trò chuyện nào.</p>
      )}

      <ul className="chat-history__list">
        {conversations.map((conversation) => (
          <li key={conversation.id}>
            <button
              type="button"
              className={`chat-history__item ${
                conversation.id === currentId ? 'chat-history__item--current' : ''
              }`}
              onClick={() => onOpen(conversation.id)}
              aria-current={conversation.id === currentId ? 'true' : undefined}
            >
              <span className="chat-history__item-title">
                {conversation.title || 'Cuộc trò chuyện'}
              </span>
              <time className="chat-history__item-when" dateTime={conversation.updatedAt}>
                {formatWhen(conversation.updatedAt)}
              </time>
            </button>
          </li>
        ))}
      </ul>
    </aside>
  );
}
