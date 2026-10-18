/**
 * The caller's conversations, most recently active first.
 *
 * A group and a one-to-one thread render as the same row: the server fills the
 * title for both, so only the avatar differs — one face, or the faces of the
 * first few members.
 */
import { Icon } from '../../../components/icon';
import { ConversationAvatar } from './conversation-avatar';
import { formatRelativeTime } from '../../../lib/format-time';
import type { Conversation } from '../work-chat-api';
import './conversation-list.css';

interface ConversationListProps {
  readonly conversations: readonly Conversation[];
  readonly activeId: string | null;
  readonly onSelect: (conversationId: string) => void;
}

export function ConversationList({
  conversations,
  activeId,
  onSelect,
}: ConversationListProps) {
  if (conversations.length === 0) {
    return (
      <p className="conversation-list__empty">
        <Icon name="chat" size={18} />
        Chưa có cuộc trò chuyện nào.
      </p>
    );
  }

  return (
    <ul className="conversation-list">
      {conversations.map((conversation) => (
        <li key={conversation.id}>
          <button
            type="button"
            className={`conversation-list__row ${
              conversation.id === activeId ? 'conversation-list__row--active' : ''
            }`}
            onClick={() => onSelect(conversation.id)}
            aria-current={conversation.id === activeId}
          >
            <ConversationAvatar conversation={conversation} />
            <span className="conversation-list__body">
              <span className="conversation-list__top">
                <span className="conversation-list__name">{conversation.title}</span>
                {conversation.lastMessageAt && (
                  <time className="conversation-list__time">
                    {formatRelativeTime(conversation.lastMessageAt)}
                  </time>
                )}
              </span>
              <span className="conversation-list__preview">
                {conversation.lastMessage ?? 'Chưa có tin nhắn'}
              </span>
            </span>
            {conversation.unreadCount > 0 && (
              <span className="conversation-list__unread" aria-label="Tin chưa đọc">
                {conversation.unreadCount}
              </span>
            )}
          </button>
        </li>
      ))}
    </ul>
  );
}

