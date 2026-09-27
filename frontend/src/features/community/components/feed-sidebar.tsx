/**
 * Feed sidebar.
 *
 * Replaces the old "total posts" vanity counter with the one thing a member can
 * act on — how many questions still need answers — plus a way back to the chat
 * the questions come from.
 */
import { Icon } from '../../../components/icon';
import type { FeedStats } from '../feed-api';
import './feed-sidebar.css';

interface FeedSidebarProps {
  readonly stats: FeedStats | null;
  readonly onShowUnanswered: () => void;
  readonly onNavigate: (path: string) => void;
}

export function FeedSidebar({
  stats,
  onShowUnanswered,
  onNavigate,
}: FeedSidebarProps) {
  const unanswered = stats?.unansweredCount ?? 0;

  return (
    <aside className="feed-sidebar">
      <button type="button" className="feed-sidebar__cta" onClick={onShowUnanswered}>
        <span className="feed-sidebar__cta-icon">
          <Icon name="help" size={20} />
        </span>
        <span className="feed-sidebar__cta-text">
          <strong>{unanswered}</strong>
          {unanswered === 0 ? ' câu hỏi đang chờ' : ' câu hỏi chưa có lời giải'}
        </span>
        <Icon name="chevron_right" size={18} />
      </button>

      <section className="feed-sidebar__card feed-sidebar__card--muted">
        <h3 className="feed-sidebar__heading">
          <Icon name="lightbulb" size={16} />
          Cách hoạt động
        </h3>
        <p className="feed-sidebar__body">
          Bảng tin gom bài viết từ các nhóm bạn tham gia. Khi tệp của nhóm chưa đủ
          căn cứ để trợ lý AI trả lời, bạn có thể đưa câu hỏi ra hỏi mọi người.
        </p>
        <button
          type="button"
          className="feed-sidebar__link"
          onClick={() => onNavigate('/workspaces')}
        >
          <Icon name="workspaces" size={16} />
          Tới Knowledge Space
        </button>
      </section>
    </aside>
  );
}
