/**
 * Discussion Page — workspace-scoped discussion list with Reddit-style mechanics.
 * Route: /workspaces/:workspaceId/discussions
 */
import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';

import { Icon } from '../../components/icon';
import { useWorkspace } from '../workspaces/workspace-context';
import { fetchDiscussions, DiscussionResponse, createDiscussion } from './community-api';
import type { FeedPostResponse } from './feed-api';
import { FeedCard } from './components/feed-card';
// This page's own modal reuses the create-post styles, which used to arrive via
// feed-page.css; they now live with the component that owns them.
import './components/create-post-modal.css';
import './discussion-page.css';

const LABELS = ['ALL', 'QUESTION', 'DISCUSSION', 'ANNOUNCEMENT'] as const;

/**
 * Presents a group's post as the shared card expects it.
 *
 * The two responses carry the same post under slightly different names, so
 * this maps rather than duplicating the card: one component means the
 * background, the attachments and the inline comments work identically here
 * and in the feed, because it is the same code drawing them.
 */
function toFeedPost(d: DiscussionResponse): FeedPostResponse {
  return {
    id: d.id,
    workspaceId: d.workspaceId,
    workspaceName: d.workspaceName ?? '',
    authorId: d.authorId,
    authorName: d.authorName,
    authorAvatar: d.authorAvatar,
    title: d.title,
    body: d.body,
    label: (d.label ?? 'DISCUSSION') as FeedPostResponse['label'],
    voteScore: d.voteScore,
    replyCount: d.replyCount,
    reactions: d.reactions,
    backgroundKey: d.backgroundKey,
    hasAcceptedAnswer: d.acceptedReplyId !== null,
    // Bookmarks are a feed concept; the group list neither shows nor sets them.
    isBookmarked: false,
    createdAt: d.createdAt,
    attachments: d.attachments ?? [],
  };
}

const DiscussionPage: React.FC = () => {
  const { workspaceId } = useParams<{ workspaceId: string }>();
  useWorkspace();
  const navigate = useNavigate();

  const [discussions, setDiscussions] = useState<DiscussionResponse[]>([]);
  const [activeLabel, setActiveLabel] = useState<string>('ALL');
  const [activeSort, setActiveSort] = useState<'HOT' | 'NEW'>('NEW');
  const [showModal, setShowModal] = useState(false);
  const [searchInput, setSearchInput] = useState('');
  const [query, setQuery] = useState('');

  // Debounce the search box so typing does not fire a request per keystroke.
  useEffect(() => {
    const timer = setTimeout(() => setQuery(searchInput.trim()), 300);
    return () => clearTimeout(timer);
  }, [searchInput]);

  useEffect(() => {
    if (!workspaceId) return;
    const label = activeLabel === 'ALL' ? undefined : activeLabel;
    // Keeps this branch's in-group search argument, and main's guard against
    // a response without a content array.
    fetchDiscussions(workspaceId, 0, 20, label, activeSort, query || undefined)
      .then((page) => setDiscussions(page?.content ?? []))
      .catch(() => setDiscussions([]));
  }, [workspaceId, activeLabel, activeSort, query]);

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
      {/* Rendered as the "Bài viết" tab of the group page, which already carries
          the group name, so only the controls remain here. */}
      <div className="disc-list__search">
        <Icon name="search" size={18} />
        <input
          type="search"
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          placeholder="Tìm trong nhóm này..."
          aria-label="Tìm bài viết trong nhóm"
        />
      </div>

      <div className="disc-list__header">
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
            <FeedCard
              key={d.id}
              post={toFeedPost(d)}
              onOpen={() => navigateToPost(d.id)}
              onNavigate={navigate}
              hideGroup
              pinned={d.pinned}
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
