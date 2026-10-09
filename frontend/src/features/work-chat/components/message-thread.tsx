/**
 * One conversation: its messages, and the box to add to them.
 *
 * Messages arrive newest-first from the server and are reversed for display,
 * so paging back through history stays a matter of appending to the array.
 */
import { useMemo } from 'react';

import { EntityAvatar } from '../../../components/entity-avatar';
import { ChatComposer } from './chat-composer';
import { MessageBubble } from './message-bubble';
import type { Conversation } from '../work-chat-api';
import type { DirectMessage } from '../work-chat-api';
import './message-thread.css';

interface MessageThreadProps {
  readonly conversation: Conversation;
  readonly messages: readonly DirectMessage[];
  readonly onSend: (
    body: string,
    files: readonly File[],
    onProgress?: (percent: number) => void,
  ) => Promise<void>;
}

export function MessageThread({ conversation, messages, onSend }: MessageThreadProps) {
  const ordered = useMemo(() => [...messages].reverse(), [messages]);

  return (
    <section className="message-thread">
      <header className="message-thread__header">
        <EntityAvatar name={conversation.otherUserName} size={34} shape="circle" />
        <h2 className="message-thread__name">{conversation.otherUserName}</h2>
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
            />
          ))
        )}
      </div>

      <ChatComposer onSend={onSend} />
    </section>
  );
}
