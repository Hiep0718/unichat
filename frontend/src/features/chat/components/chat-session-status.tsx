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
    {error && <div className="chat-session-status chat-session-status--error" role="alert">
      <Icon className="chat-session-status__icon" name="error" size={22} />
      <div className="chat-session-status__body">
        <strong>Không thể hoàn tất yêu cầu</strong>
        <p>{error}</p>
      </div>
      {canRetry && <button className="chat-session-status__retry" type="button" onClick={onRetry}>
        <Icon name="refresh" size={18} />Kiểm tra lại
      </button>}
    </div>}
  </>;
}
