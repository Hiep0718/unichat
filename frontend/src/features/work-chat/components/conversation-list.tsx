/**
 * The caller's conversations, most recently active first.
 */
import { Icon } from '../../../components/icon';
import { EntityAvatar } from '../../../components/entity-avatar';
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
            <EntityAvatar name={conversation.otherUserName} size={36} shape="circle" />
            <span className="conversation-list__body">
              <span className="conversation-list__top">
                <span className="conversation-list__name">{conversation.otherUserName}</span>
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
