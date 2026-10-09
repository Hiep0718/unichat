/**
 * One message in the transcript.
 *
 * The text is optional, because a message may be nothing but files; nothing is
 * rendered in its place when it is absent, so a file-only message is a bubble
 * holding the file rather than an empty line above it.
 */
import { formatRelativeTime } from '../../../lib/format-time';
import { MessageAttachments } from './message-attachments';
import type { DirectMessage } from '../work-chat-api';

interface MessageBubbleProps {
  readonly conversationId: string;
  readonly message: DirectMessage;
}

export function MessageBubble({ conversationId, message }: MessageBubbleProps) {
  return (
    <article className={`message-bubble ${message.mine ? 'message-bubble--mine' : ''}`}>
      {message.body && <p className="message-bubble__body">{message.body}</p>}

      <MessageAttachments
        conversationId={conversationId}
        messageId={message.id}
        attachments={message.attachments}
      />

      <time className="message-bubble__time" dateTime={message.createdAt}>
        {formatRelativeTime(message.createdAt)}
      </time>
    </article>
  );
}
