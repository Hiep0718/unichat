/**
 * Feed sidebar.
 *
 * Replaces the old "total posts" vanity counter with things a member can act
 * on: how many questions still need answers, which tags are live, and a way
 * back to the chat the questions come from.
 */
import { Icon } from '../../../components/icon';
import type { FeedStats, TrendingTag } from '../feed-api';
import './feed-sidebar.css';

interface FeedSidebarProps {
  readonly stats: FeedStats | null;
  readonly trendingTags: readonly TrendingTag[];
  readonly activeTag: string | null;
  readonly onTagClick: (tag: string) => void;
  readonly onShowUnanswered: () => void;
  readonly onNavigate: (path: string) => void;
}

export function FeedSidebar({
  stats,
  trendingTags,
  activeTag,
  onTagClick,
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

      <section className="feed-sidebar__card">
        <h3 className="feed-sidebar__heading">
          <Icon name="tag" size={16} />
          Chủ đề đang bàn
        </h3>
        {trendingTags.length > 0 ? (
          <ul className="feed-sidebar__tags">
            {trendingTags.map((t) => (
              <li key={t.tag}>
                <button
                  type="button"
                  className={`feed-sidebar__tag ${activeTag === t.tag ? 'feed-sidebar__tag--active' : ''}`}
                  onClick={() => onTagClick(t.tag)}
                >
                  <span className="feed-sidebar__tag-name">{t.tag}</span>
                  <span className="feed-sidebar__tag-count">{t.count}</span>
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <p className="feed-sidebar__empty">
            Chưa có chủ đề nào trong tuần này.
          </p>
        )}
      </section>

      <section className="feed-sidebar__card feed-sidebar__card--muted">
        <h3 className="feed-sidebar__heading">
          <Icon name="lightbulb" size={16} />
          Cách hoạt động
        </h3>
        <p className="feed-sidebar__body">
          Khi tài liệu chưa đủ căn cứ để AI trả lời, câu hỏi được đưa lên đây.
          Câu trả lời được chấp nhận sẽ trở thành nguồn tri thức mới cho Workspace.
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
