/**
 * Discussion Page — workspace-scoped discussion list with Reddit-style mechanics.
 * Route: /workspaces/:workspaceId/discussions
 */
import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';

import { Icon } from '../../components/icon';
import { formatRelativeTime } from '../../lib/format-time';
import { useWorkspace } from '../workspaces/workspace-context';
import { fetchDiscussions, DiscussionResponse, createDiscussion } from './community-api';
import { VoteControl } from './components/vote-control';
import './discussion-page.css';

const LABELS = ['ALL', 'QUESTION', 'DISCUSSION', 'ANNOUNCEMENT'] as const;

const DiscussionPage: React.FC = () => {
  const { workspaceId } = useParams<{ workspaceId: string }>();
  useWorkspace();
  const navigate = useNavigate();

  const [discussions, setDiscussions] = useState<DiscussionResponse[]>([]);
  const [activeLabel, setActiveLabel] = useState<string>('ALL');
  const [activeSort, setActiveSort] = useState<'HOT' | 'NEW'>('NEW');
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    if (!workspaceId) return;
    const label = activeLabel === 'ALL' ? undefined : activeLabel;
    fetchDiscussions(workspaceId, 0, 20, label, activeSort)
      .then((page) => setDiscussions(page.content))
      .catch(() => setDiscussions([]));
  }, [workspaceId, activeLabel, activeSort]);

  const navigateToPost = (discussionId: string) => {
    navigate(`/feed/posts/${discussionId}?workspaceId=${workspaceId}`);
  };

  const labelName = (l: string) => {
    switch (l) {
      case 'ALL': return 'Tất cả';
      case 'QUESTION': return 'Câu hỏi';
      case 'DISCUSSION': return 'Thảo luận';
      case 'ANNOUNCEMENT': return 'Thông báo';
      default: return l;
    }
  };

  return (
    <div className="disc-list">
      <div className="disc-list__header">
        <h1 className="disc-list__title">
          <Icon name="forum" size={28} className="disc-list__title-icon" />
          Thảo luận
        </h1>
        <div className="disc-list__controls">
          {LABELS.map((l) => (
            <button
              key={l}
              className={`disc-list__filter-btn ${activeLabel === l ? 'disc-list__filter-btn--active' : ''}`}
              onClick={() => setActiveLabel(l)}
            >
              {labelName(l)}
            </button>
          ))}
          <div className="disc-list__divider" />
          <button
            className={`disc-list__filter-btn ${activeSort === 'HOT' ? 'disc-list__filter-btn--active' : ''}`}
            onClick={() => setActiveSort('HOT')}
          >
            🔥 Hot
          </button>
          <button
            className={`disc-list__filter-btn ${activeSort === 'NEW' ? 'disc-list__filter-btn--active' : ''}`}
            onClick={() => setActiveSort('NEW')}
          >
            🆕 Mới
          </button>
          <button className="disc-list__new-btn" onClick={() => setShowModal(true)}>
            <Icon name="add" size={18} /> Tạo bài mới
          </button>
        </div>
      </div>

      {discussions.length === 0 ? (
        <DiscussionEmptyState />
      ) : (
        <div className="disc-list__cards">
          {discussions.map((d) => (
            <DiscussionCard
              key={d.id}
              discussion={d}
              labelName={labelName}
              onClick={() => navigateToPost(d.id)}
            />
          ))}
        </div>
      )}

      {showModal && workspaceId && (
        <NewDiscussionModal
          workspaceId={workspaceId}
          onClose={() => setShowModal(false)}
          onCreate={(d) => {
            setDiscussions((prev) => [d, ...prev]);
            setShowModal(false);
          }}
        />
      )}
    </div>
  );
};

/* ---------- Discussion Card ---------- */

interface DiscussionCardProps {
  discussion: DiscussionResponse;
  labelName: (l: string) => string;
  onClick: () => void;
}

function DiscussionCard({ discussion: d, labelName, onClick }: DiscussionCardProps) {
  return (
    <div className={`disc-card ${d.pinned ? 'disc-card--pinned' : ''}`} onClick={onClick}>
      <div className="disc-card__meta">
        <span className="disc-card__meta-item">
          <Icon name="person" size={14} /> {d.authorName}
        </span>
        <span className="disc-card__dot">•</span>
        <span className="disc-card__meta-item">
          <Icon name="schedule" size={14} /> {formatRelativeTime(d.updatedAt)}
        </span>
      </div>
      <h3 className="disc-card__title">
        {d.label && (
          <span className={`disc-card__label disc-card__label--${d.label.toLowerCase()}`}>
            {labelName(d.label)}
          </span>
        )}
        {d.title}
      </h3>
      <p className="disc-card__excerpt">{d.body}</p>
      <div className="disc-card__footer">
        <VoteControl
          targetType="DISCUSSION"
          targetId={d.id}
          initialScore={d.voteScore}
          initialVote={d.userVote}
          orientation="horizontal"
        />
        <span className="disc-card__action-btn">
          <Icon name="chat_bubble_outline" size={16} /> {d.replyCount} Bình luận
        </span>
      </div>
    </div>
  );
}

/* ---------- Empty State ---------- */
function DiscussionEmptyState() {
  return (
    <div className="disc-list__empty">
      <div className="disc-list__empty-icon">
        <Icon name="forum" size={32} />
      </div>
      <h3>Chưa có bài thảo luận</h3>
      <p>Hãy là người đầu tiên tạo chủ đề thảo luận trong workspace này.</p>
    </div>
  );
}

/* ---------- New Discussion Modal ---------- */

interface NewDiscussionModalProps {
  workspaceId: string;
  onClose: () => void;
  onCreate: (d: DiscussionResponse) => void;
}

function NewDiscussionModal({ workspaceId, onClose, onCreate }: NewDiscussionModalProps) {
  const { canEdit } = useWorkspace();
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [label, setLabel] = useState('DISCUSSION');
  const [loading, setLoading] = useState(false);

  const canMakeAnnouncement = canEdit;

  useEffect(() => {
    if (label === 'ANNOUNCEMENT' && !canMakeAnnouncement) {
      setLabel('DISCUSSION');
    }
  }, [canMakeAnnouncement, label]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !body.trim()) return;
    setLoading(true);
    try {
      const result = await createDiscussion(workspaceId, {
        title: title.trim(),
        body: body.trim(),
        label,
      });
      onCreate(result);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="create-post-overlay" onClick={onClose}>
      <div className="create-post-modal" onClick={(e) => e.stopPropagation()}>
        <div className="create-post-modal__header">
          <h2 className="create-post-modal__title">Tạo bài thảo luận mới</h2>
          <button className="create-post-modal__close" onClick={onClose}>
            <Icon name="close" size={20} />
          </button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="create-post-modal__body">
            <div className="create-post-modal__field">
              <label className="create-post-modal__label">Loại bài viết</label>
              <div className="create-post-modal__label-pills">
                {(['QUESTION', 'DISCUSSION', 'ANNOUNCEMENT'] as const).map((l) => {
                  if (l === 'ANNOUNCEMENT' && !canMakeAnnouncement) return null;
                  return (
                    <button
                      key={l}
                      type="button"
                      className={`create-post-modal__pill ${label === l ? 'create-post-modal__pill--active' : ''}`}
                      onClick={() => setLabel(l)}
                    >
                      {l === 'QUESTION' && '❓ Câu hỏi'}
                      {l === 'DISCUSSION' && '💬 Thảo luận'}
                      {l === 'ANNOUNCEMENT' && '📢 Thông báo'}
                    </button>
                  );
                })}
              </div>
            </div>
            <div className="create-post-modal__field">
              <label className="create-post-modal__label">Tiêu đề</label>
              <input
                className="create-post-modal__input"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Nhập tiêu đề bài viết..."
                maxLength={200}
                required
              />
            </div>
            <div className="create-post-modal__field">
              <label className="create-post-modal__label">Nội dung</label>
              <textarea
                className="create-post-modal__textarea"
                value={body}
                onChange={(e) => setBody(e.target.value)}
                placeholder="Viết nội dung bài thảo luận..."
                required
              />
            </div>
          </div>
          <div className="create-post-modal__footer">
            <button type="button" className="create-post-modal__cancel-btn" onClick={onClose}>
              Hủy
            </button>
            <button
              type="submit"
              className="create-post-modal__submit-btn"
              disabled={loading || !title.trim() || !body.trim()}
            >
              {loading ? 'Đang đăng...' : 'Đăng bài'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default DiscussionPage;
