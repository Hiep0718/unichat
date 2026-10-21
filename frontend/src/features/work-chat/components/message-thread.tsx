/**
 * One conversation: its messages, and the box to add to them.
 *
 * Messages arrive newest-first from the server and are reversed for display,
 * so paging back through history stays a matter of appending to the array.
 */
import { useMemo } from 'react';

import { Icon } from '../../../components/icon';
import { CallButton } from '../../calls/components/call-button';
import { CallLogEntry } from '../../calls/components/call-log-entry';
import { ConversationAvatar } from './conversation-avatar';
import { ChatComposer } from './chat-composer';
import { MessageBubble } from './message-bubble';
import type { CallHistoryEntryDto } from '../../calls/call-api';
import type { Conversation, DirectMessage } from '../work-chat-api';
import './message-thread.css';

interface MessageThreadProps {
  readonly conversation: Conversation;
  readonly messages: readonly DirectMessage[];
  /** Calls in this conversation, merged into the thread by time. */
  readonly calls?: readonly CallHistoryEntryDto[];
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
  calls = [],
  onSend,
  onToggleSettings,
  settingsOpen,
}: MessageThreadProps) {
  // Messages and calls are interleaved by time rather than stacked in two
  // groups: a call that happened mid-conversation belongs where it happened.
  // Both arrive newest-first, so the merged list is reversed once at the end.
  const ordered = useMemo(() => {
    const entries = [
      ...messages.map((message) => ({ at: message.createdAt, message, call: null })),
      ...calls.map((call) => ({ at: call.startedAt, message: null, call })),
    ];
    entries.sort((a, b) => Date.parse(b.at) - Date.parse(a.at));
    return entries.reverse();
  }, [messages, calls]);
  const isGroup = conversation.kind === 'GROUP';

  return (
    <section className="message-thread">
      <header className="message-thread__header">
        <ConversationAvatar conversation={conversation} size={34} />
        <h2 className="message-thread__name">{conversation.title}</h2>

        {/* One-to-one only: a group call needs a media server, which is not
            built, so the button would promise something that fails. */}
        {!isGroup && (
          <CallButton conversationId={conversation.id} peerName={conversation.title} />
        )}

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
          ordered.map((entry) =>
            entry.call ? (
              <CallLogEntry key={`call-${entry.call.id}`} entry={entry.call} />
            ) : (
              <MessageBubble
                key={entry.message!.id}
                conversationId={conversation.id}
                message={entry.message!}
                showSender={isGroup}
              />
            ),
          )
        )}
      </div>

      <ChatComposer onSend={onSend} />
    </section>
  );
}
