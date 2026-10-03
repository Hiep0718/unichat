/**
 * One conversation: its messages, and the box to add to them.
 *
 * Messages arrive newest-first from the server and are reversed for display,
 * so paging back through history stays a matter of appending to the array.
 */
import { useMemo, useState } from 'react';

import { Icon } from '../../../components/icon';
import { EntityAvatar } from '../../../components/entity-avatar';
import { formatRelativeTime } from '../../../lib/format-time';
import type { Conversation, DirectMessage } from '../work-chat-api';
import './message-thread.css';

interface MessageThreadProps {
  readonly conversation: Conversation;
  readonly messages: readonly DirectMessage[];
  readonly onSend: (body: string) => Promise<void>;
}

export function MessageThread({ conversation, messages, onSend }: MessageThreadProps) {
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const [failed, setFailed] = useState(false);

  const ordered = useMemo(() => [...messages].reverse(), [messages]);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    const body = draft.trim();
    if (!body || sending) {
      return;
    }
    setSending(true);
    setFailed(false);
    try {
      await onSend(body);
      setDraft('');
    } catch {
      // The draft is kept so a failed send does not lose what was typed.
      setFailed(true);
    } finally {
      setSending(false);
    }
  };

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
            <article
              key={message.id}
              className={`message-bubble ${message.mine ? 'message-bubble--mine' : ''}`}
            >
              <p className="message-bubble__body">{message.body}</p>
              <time className="message-bubble__time" dateTime={message.createdAt}>
                {formatRelativeTime(message.createdAt)}
              </time>
            </article>
          ))
        )}
      </div>

      <form className="message-thread__composer" onSubmit={submit}>
        {failed && (
          <p className="message-thread__failed" role="alert">
            Không gửi được. Thử lại nhé.
          </p>
        )}
        <div className="message-thread__input-row">
          <input
            className="message-thread__input"
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            placeholder="Nhập tin nhắn..."
            maxLength={4000}
            aria-label="Nội dung tin nhắn"
          />
          <button
            type="submit"
            className="message-thread__send"
            disabled={!draft.trim() || sending}
            aria-label="Gửi"
          >
            <Icon name="send" size={18} />
          </button>
        </div>
      </form>
    </section>
  );
}
