import React, { useState, useEffect } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';

import { Icon } from '../../components/icon';
import { useWorkspace } from '../workspaces/workspace-context';
import {
  fetchDiscussions,
  createDiscussion,
  fetchReplies,
  addReply,
  DiscussionResponse,
  ReplyResponse,
  getDiscussion,
} from './community-api';
import { VoteControl } from './components/vote-control';
import './discussion-page.css';

const LABELS = ['ALL', 'QUESTION', 'DISCUSSION', 'ANNOUNCEMENT'] as const;

const DiscussionPage: React.FC = () => {
  const { workspaceId } = useParams<{ workspaceId: string }>();
  useWorkspace();

  const [discussions, setDiscussions] = useState<DiscussionResponse[]>([]);
  const [activeLabel, setActiveLabel] = useState<string>('ALL');
  const [activeSort, setActiveSort] = useState<'HOT' | 'NEW'>('NEW');
  const [showModal, setShowModal] = useState(false);
  const [selectedDiscussion, setSelectedDiscussion] = useState<DiscussionResponse | null>(null);

  const [searchParams, setSearchParams] = useSearchParams();
  const discussionIdParam = searchParams.get('discussionId');

  // Load discussions
  useEffect(() => {
    if (!workspaceId) return;
    const label = activeLabel === 'ALL' ? undefined : activeLabel;
    fetchDiscussions(workspaceId, 0, 20, label, activeSort)
      .then((page) => setDiscussions(page.content))
      .catch(() => setDiscussions([]));
  }, [workspaceId, activeLabel, activeSort]);

  // Handle deep linking from Feed
  useEffect(() => {
    if (workspaceId && discussionIdParam) {
      getDiscussion(workspaceId, discussionIdParam)
        .then((d) => setSelectedDiscussion(d))
        .catch(() => {
          // If not found, just clear the param
          setSearchParams({});
        });
    }
  }, [workspaceId, discussionIdParam, setSearchParams]);

  if (selectedDiscussion && workspaceId) {
    return (
      <DiscussionDetail
        workspaceId={workspaceId}
        discussion={selectedDiscussion}
        onBack={() => {
          setSelectedDiscussion(null);
          setSearchParams({});
        }}
      />
    );
  }

  const labelName = (l: string) => {
    switch (l) {
      case 'ALL': return 'Tất cả';
      case 'QUESTION': return 'Câu hỏi';
      case 'DISCUSSION': return 'Thảo luận';
      case 'ANNOUNCEMENT': return 'Thông báo';
      default: return l;
    }
  };

  const formatDate = (iso: string) => {
    try {
      return new Date(iso).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
    } catch { return ''; }
  };

  return (
    <div className="discussion-list">
      <div className="discussion-list__header">
        <h1 className="discussion-list__title">
          <Icon name="forum" size={28} className="discussion-list__title-icon" />
          Thảo luận
        </h1>
        <div className="discussion-list__actions">
          {LABELS.map((l) => (
            <button
              key={l}
              className={`discussion-list__filter-btn ${activeLabel === l ? 'discussion-list__filter-btn--active' : ''}`}
              onClick={() => setActiveLabel(l)}
            >
              {labelName(l)}
            </button>
          ))}
          
          <div className="discussion-list__divider" />
          
          <button
            className={`discussion-list__filter-btn ${activeSort === 'HOT' ? 'discussion-list__filter-btn--active' : ''}`}
            onClick={() => setActiveSort('HOT')}
          >
            🔥 HOT
          </button>
          <button
            className={`discussion-list__filter-btn ${activeSort === 'NEW' ? 'discussion-list__filter-btn--active' : ''}`}
            onClick={() => setActiveSort('NEW')}
          >
            🆕 NEW
          </button>

          <button className="discussion-list__new-btn" onClick={() => setShowModal(true)}>
            <Icon name="add" size={18} />
            Tạo bài mới
          </button>
        </div>
      </div>

      {discussions.length === 0 ? (
        <div className="discussion-list__empty">
          <div className="discussion-list__empty-icon">
            <Icon name="forum" size={28} />
          </div>
          <p style={{ font: 'var(--font-headline-md)', marginBottom: '8px' }}>Chưa có bài thảo luận</p>
          <p>Hãy là người đầu tiên tạo chủ đề thảo luận trong workspace này.</p>
        </div>
      ) : (
        discussions.map((d) => (
          <div
            key={d.id}
            className={`discussion-card ${d.pinned ? 'discussion-card__pinned' : ''}`}
            onClick={() => {
              setSelectedDiscussion(d);
              setSearchParams({ discussionId: d.id });
            }}
          >
            <div className="discussion-card__meta">
              <span className="discussion-card__meta-item">
                <Icon name="person" size={14} /> {d.authorName}
              </span>
              <span className="discussion-card__dot">•</span>
              <span className="discussion-card__meta-item">
                <Icon name="schedule" size={14} /> {formatDate(d.updatedAt)}
              </span>
            </div>
            
            <h3 className="discussion-card__title">
              {d.label && (
                <span className={`discussion-card__label discussion-card__label--${d.label.toLowerCase()}`}>
                  {labelName(d.label)}
                </span>
              )}
              {d.title}
            </h3>
            
            <p className="discussion-card__excerpt">{d.body}</p>
            
            <div className="discussion-card__footer">
              <VoteControl 
                targetType="DISCUSSION"
                targetId={d.id}
                initialScore={d.voteScore}
                initialVote={d.userVote}
                orientation="horizontal"
              />
              <span className="discussion-card__action-btn">
                <Icon name="comment" size={16} /> {d.replyCount} Bình luận
              </span>
              <span className="discussion-card__action-btn">
                <Icon name="share" size={16} /> Chia sẻ
              </span>
            </div>
          </div>
        ))
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

/* ---------- New Discussion Modal ---------- */

interface NewDiscussionModalProps {
  workspaceId: string;
  onClose: () => void;
  onCreate: (d: DiscussionResponse) => void;
}

const NewDiscussionModal: React.FC<NewDiscussionModalProps> = ({ workspaceId, onClose, onCreate }) => {
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [label, setLabel] = useState('DISCUSSION');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !body.trim()) return;
    setLoading(true);
    try {
      const result = await createDiscussion(workspaceId, { title: title.trim(), body: body.trim(), label });
      onCreate(result);
    } catch {
      /* handled silently */
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="discussion-modal-overlay" onClick={onClose}>
      <div className="discussion-modal" onClick={(e) => e.stopPropagation()}>
        <div className="discussion-modal__header">
          <h2 className="discussion-modal__title">Tạo bài thảo luận mới</h2>
          <button className="discussion-modal__close" onClick={onClose}>
            <Icon name="close" size={20} />
          </button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="discussion-modal__body">
            <div className="discussion-modal__field">
              <label className="discussion-modal__label">Tiêu đề</label>
              <input
                className="discussion-modal__input"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Nhập tiêu đề bài viết..."
                maxLength={200}
                required
              />
            </div>
            <div className="discussion-modal__field">
              <label className="discussion-modal__label">Nhãn</label>
              <select className="discussion-modal__select" value={label} onChange={(e) => setLabel(e.target.value)}>
                <option value="QUESTION">Câu hỏi</option>
                <option value="DISCUSSION">Thảo luận</option>
                <option value="ANNOUNCEMENT">Thông báo</option>
              </select>
            </div>
            <div className="discussion-modal__field">
              <label className="discussion-modal__label">Nội dung</label>
              <textarea
                className="discussion-modal__textarea"
                value={body}
                onChange={(e) => setBody(e.target.value)}
                placeholder="Viết nội dung bài thảo luận... (Gõ @AI để yêu cầu AI trả lời)"
                required
              />
            </div>
          </div>
          <div className="discussion-modal__footer">
            <button type="button" className="discussion-modal__cancel-btn" onClick={onClose}>
              Hủy
            </button>
            <button type="submit" className="discussion-modal__submit-btn" disabled={loading || !title.trim() || !body.trim()}>
              {loading ? 'Đang đăng...' : 'Đăng bài'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

/* ---------- Discussion Detail ---------- */

interface DiscussionDetailProps {
  workspaceId: string;
  discussion: DiscussionResponse;
  onBack: () => void;
}

const DiscussionDetail: React.FC<DiscussionDetailProps> = ({ workspaceId, discussion: initialDiscussion, onBack }) => {
  const [discussion, setDiscussion] = useState(initialDiscussion);
  const [replies, setReplies] = useState<ReplyResponse[]>([]);
  const [replyInput, setReplyInput] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Refresh discussion to get latest viewCount and score
    getDiscussion(workspaceId, initialDiscussion.id)
      .then(setDiscussion)
      .catch(console.error);

    fetchReplies(workspaceId, initialDiscussion.id)
      .then(setReplies)
      .catch(() => setReplies([]));
  }, [workspaceId, initialDiscussion.id]);

  const handleAddReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!replyInput.trim()) return;
    setLoading(true);
    try {
      const result = await addReply(workspaceId, discussion.id, { body: replyInput.trim() });
      setReplies((prev) => [...prev, result]);
      setReplyInput('');
    } catch {
      /* handled silently */
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (iso: string) => {
    try {
      return new Date(iso).toLocaleString('vi-VN', {
        day: '2-digit', month: '2-digit', year: 'numeric',
        hour: '2-digit', minute: '2-digit',
      });
    } catch { return ''; }
  };

  return (
    <div className="discussion-detail-wrapper">
      <div className="discussion-detail">
        <button className="discussion-detail__back" onClick={onBack}>
          <Icon name="arrow_back" size={18} />
          Quay lại danh sách
        </button>

      <div className="discussion-detail__post">
        <div className="discussion-detail__post-content">
          <div className="discussion-detail__post-meta">
            <span>Đăng bởi {discussion.authorName}</span>
            <span>•</span>
            <span>{formatTime(discussion.createdAt)}</span>
            <span>•</span>
            <span>{discussion.viewCount} lượt xem</span>
          </div>
          <h1 className="discussion-detail__post-title">{discussion.title}</h1>
          <p className="discussion-detail__post-body">{discussion.body}</p>
          
          <div className="discussion-detail__post-actions">
            <VoteControl 
              targetType="DISCUSSION"
              targetId={discussion.id}
              initialScore={discussion.voteScore}
              initialVote={discussion.userVote}
              orientation="horizontal"
            />
            <span className="discussion-detail__action-btn">
              <Icon name="comment" size={18} />
              {discussion.replyCount} Bình luận
            </span>
            <span className="discussion-detail__action-btn">
              <Icon name="share" size={18} />
              Chia sẻ
            </span>
          </div>
        </div>
      </div>

      <h2 className="discussion-detail__replies-header">
        <Icon name="comment" size={22} />
        {replies.length} Trả lời
      </h2>

      {replies.map((r) => (
        <div key={r.id} className={`discussion-reply ${r.isAiAnswer ? 'discussion-reply--ai' : ''}`}>
          <div className="discussion-reply__avatar">
            {r.isAiAnswer ? <Icon name="smart_toy" size={16} /> : r.authorName?.charAt(0) || '?'}
          </div>
          <div className="discussion-reply__content-wrapper">
            <div className="discussion-reply__meta">
              <span className="discussion-reply__author">
                {r.isAiAnswer ? 'UniChat AI' : r.authorName}
              </span>
              <span className="discussion-reply__time">{formatTime(r.createdAt)}</span>
            </div>
            <p className="discussion-reply__body">{r.body}</p>
            <div className="discussion-reply__actions">
              <VoteControl 
                targetType="DISCUSSION_REPLY"
                targetId={r.id}
                initialScore={r.voteScore}
                initialVote={r.userVote}
                orientation="horizontal"
              />
            </div>
          </div>
        </div>
      ))}

      <form className="discussion-reply-form" onSubmit={handleAddReply}>
        <textarea
          className="discussion-reply-form__input"
          value={replyInput}
          onChange={(e) => setReplyInput(e.target.value)}
          placeholder="Viết bình luận... (Gõ @AI để yêu cầu AI trả lời)"
          rows={2}
        />
        <button
          type="submit"
          className="discussion-reply-form__submit"
          disabled={loading || !replyInput.trim()}
        >
          {loading ? 'Đang gửi...' : 'Trả lời'}
        </button>
      </form>
      </div>
    </div>
  );
};

export default DiscussionPage;
