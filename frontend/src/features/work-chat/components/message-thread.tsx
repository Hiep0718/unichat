/**
 * One conversation: its messages, and the box to add to them.
 *
 * Messages arrive newest-first from the server and are reversed for display,
 * so paging back through history stays a matter of appending to the array.
 */
import { useMemo } from 'react';

import { Icon } from '../../../components/icon';
import { ConversationAvatar } from './conversation-avatar';
import { ChatComposer } from './chat-composer';
import { MessageBubble } from './message-bubble';
import type { Conversation, DirectMessage } from '../work-chat-api';
import './message-thread.css';

interface MessageThreadProps {
  readonly conversation: Conversation;
  readonly messages: readonly DirectMessage[];
  readonly onSend: (
    body: string,
    files: readonly File[],
    onProgress?: (percent: number) => void,
  ) => Promise<void>;
  /** Shows or hides the settings panel. Only meaningful for a group. */
  readonly onToggleSettings: () => void;
  /** Whether that panel is currently open, so the button can say so. */
  readonly settingsOpen: boolean;
}

export function MessageThread({
  conversation,
  messages,
  onSend,
  onToggleSettings,
  settingsOpen,
}: MessageThreadProps) {
  const ordered = useMemo(() => [...messages].reverse(), [messages]);
  const isGroup = conversation.kind === 'GROUP';

  return (
    <section className="message-thread">
      <header className="message-thread__header">
        <ConversationAvatar conversation={conversation} size={34} />
        <h2 className="message-thread__name">{conversation.title}</h2>

        {isGroup && (
          <button
            type="button"
            className={`message-thread__members ${
              settingsOpen ? 'message-thread__members--active' : ''
            }`}
            onClick={onToggleSettings}
            aria-pressed={settingsOpen}
            aria-label={settingsOpen ? 'Ẩn cài đặt nhóm' : 'Hiện cài đặt nhóm'}
          >
            <Icon name="group" size={18} />
            {conversation.participants.length}
          </button>
        )}
      </header>

      <div className="message-thread__messages">
        {ordered.length === 0 ? (
          <p className="message-thread__empty">
            Chưa có tin nhắn. Gửi lời chào trước nhé.
          </p>
        ) : (
          ordered.map((message) => (
            <MessageBubble
              key={message.id}
              conversationId={conversation.id}
              message={message}
              showSender={isGroup}
            />
          ))
        )}
      </div>

      <ChatComposer onSend={onSend} />
    </section>
  );
}
