import aiAvatar from '../../../assets/ai-avatar.png';
import { Icon } from '../../../components/icon';

import './chat-session-status.css';

interface ChatSessionStatusProps {
  readonly initialLoading: boolean;
  readonly hasOlder: boolean;
  readonly error: string | null;
  readonly canRetry: boolean;
  readonly onLoadOlder: () => void;
  readonly onRetry: () => void;
}

interface ChatInlineErrorProps {
  readonly error: string;
  readonly canRetry: boolean;
  readonly onRetry: () => void;
}

/** Presents chat loading, pagination and recoverable failure states consistently. */
export function ChatSessionStatus({
  initialLoading,
  hasOlder,
  error,
  canRetry,
  onLoadOlder,
  onRetry,
}: ChatSessionStatusProps) {
  return <>
    {initialLoading && <div className="chat-session-status chat-session-status--loading" role="status">
      <span className="chat-session-status__spinner" aria-hidden="true" />
      Đang tải lịch sử hội thoại…
    </div>}
    {hasOlder && <button className="chat-session-status__older" type="button" onClick={onLoadOlder}>
      <Icon name="history" size={18} />Tải tin nhắn cũ hơn
    </button>}
    {error && <ChatInlineError error={error} canRetry={canRetry} onRetry={onRetry} />}
  </>;
}

/** Renders a recoverable AI turn error right at the bottom of the chat stream under the failed question. */
export function ChatInlineError({ error, canRetry, onRetry }: ChatInlineErrorProps) {
  return (
    <article className="chat-msg chat-msg--assistant chat-msg--error">
      <div className="chat-msg__avatar" aria-hidden="true">
        <img className="chat-msg__ai-avatar-img" src={aiAvatar} alt="" />
      </div>
      <div className="chat-msg__content chat-msg__content-zone">
        <header className="chat-msg__header">
          <strong className="chat-msg__author">UniChat AI</strong>
        </header>
        <div className="chat-session-status chat-session-status--error chat-session-status--inline" role="alert">
          <Icon className="chat-session-status__icon" name="error" size={20} />
          <div className="chat-session-status__body">
            <strong>Không thể hoàn tất yêu cầu</strong>
            <p>{error}</p>
          </div>
          {canRetry && (
            <button className="chat-session-status__retry" type="button" onClick={onRetry}>
              <Icon name="refresh" size={17} />Kiểm tra lại
            </button>
          )}
        </div>
      </div>
    </article>
  );
}
