import React, { useState, useEffect } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';

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

  const navigate = useNavigate();
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
          if (discussionIdParam) {
            navigate(-1);
          } else {
            setSelectedDiscussion(null);
            setSearchParams({});
          }
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

/* ---------- Discussion Reply Form ---------- */
interface DiscussionReplyFormProps {
  loading: boolean;
  onSubmit: (body: string) => void;
  onCancel?: () => void;
  autoFocus?: boolean;
}

const DiscussionReplyForm: React.FC<DiscussionReplyFormProps> = ({ loading, onSubmit, onCancel, autoFocus }) => {
  const [replyInput, setReplyInput] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!replyInput.trim()) return;
    onSubmit(replyInput);
    setReplyInput('');
  };

  return (
    <form className="discussion-reply-form" onSubmit={handleSubmit}>
      <textarea
        className="discussion-reply-form__input"
        value={replyInput}
        onChange={(e) => setReplyInput(e.target.value)}
        placeholder="Viết bình luận... (Gõ @AI để yêu cầu AI trả lời)"
        rows={3}
        autoFocus={autoFocus}
      />
      <div className="discussion-reply-form__footer">
        {onCancel && (
          <button type="button" className="discussion-reply-form__cancel" onClick={onCancel}>
            Hủy
          </button>
        )}
        <button
          type="submit"
          className="discussion-reply-form__submit"
          disabled={loading || !replyInput.trim()}
        >
          {loading ? 'Đang gửi...' : 'Bình luận'}
        </button>
      </div>
    </form>
  );
};

/* ---------- Discussion Detail ---------- */

export interface DiscussionDetailProps {
  workspaceId: string;
  discussion: DiscussionResponse;
  onBack: () => void;
}

export const DiscussionDetail: React.FC<DiscussionDetailProps> = ({ workspaceId, discussion: initialDiscussion, onBack }) => {
  const [discussion, setDiscussion] = useState(initialDiscussion);
  const [replies, setReplies] = useState<ReplyResponse[]>([]);
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

  const formatTime = (iso: string) => {
    try {
      return new Date(iso).toLocaleString('vi-VN', {
        day: '2-digit', month: '2-digit', year: 'numeric',
        hour: '2-digit', minute: '2-digit',
      });
    } catch { return ''; }
  };

  const handleAddReply = async (body: string, parentId?: string) => {
    setLoading(true);
    try {
      const payload: any = { body };
      if (parentId) payload.parentReplyId = parentId;
      const result = await addReply(workspaceId, discussion.id, payload);
      setReplies((prev) => [...prev, result]);
    } catch {
      /* handled silently */
    } finally {
      setLoading(false);
    }
  };

  const repliesByParent = React.useMemo(() => {
    const map = new Map<string | null, ReplyResponse[]>();
    map.set(null, []);
    replies.forEach((r) => {
      const pId = r.parentReplyId || null;
      if (!map.has(pId)) map.set(pId, []);
      map.get(pId)!.push(r);
    });
    return map;
  }, [replies]);

  const ReplyThread = ({ reply }: { reply: ReplyResponse }) => {
    const children = repliesByParent.get(reply.id) || [];
    const [showForm, setShowForm] = useState(false);

    return (
      <div className="discussion-reply-thread">
        <div className={`discussion-reply ${reply.isAiAnswer ? 'discussion-reply--ai' : ''}`}>
          <div className="discussion-reply__avatar">
            {reply.isAiAnswer ? <Icon name="smart_toy" size={16} /> : reply.authorName?.charAt(0) || '?'}
          </div>
          <div className="discussion-reply__content-wrapper">
            <div className="discussion-reply__meta">
              <span className="discussion-reply__author">
                {reply.isAiAnswer ? 'UniChat AI' : reply.authorName}
              </span>
              <span className="discussion-reply__time">{formatTime(reply.createdAt)}</span>
            </div>
            <p className="discussion-reply__body">{reply.body}</p>
            <div className="discussion-reply__actions">
              <VoteControl 
                targetType="DISCUSSION_REPLY"
                targetId={reply.id}
                initialScore={reply.voteScore}
                initialVote={reply.userVote}
                orientation="horizontal"
              />
              <button className="discussion-reply__action-btn" onClick={() => setShowForm(!showForm)}>
                <Icon name="reply" size={16} /> Trả lời
              </button>
            </div>
            {showForm && (
              <div className="discussion-reply-form-wrapper">
                <DiscussionReplyForm 
                  loading={loading} 
                  onSubmit={async (b) => { await handleAddReply(b, reply.id); setShowForm(false); }} 
                  onCancel={() => setShowForm(false)}
                  autoFocus
                />
              </div>
            )}
          </div>
        </div>
        {children.length > 0 && (
          <div className="discussion-reply-children">
            {children.map((child) => (
              <ReplyThread key={child.id} reply={child} />
            ))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="discussion-detail-wrapper" onClick={onBack}>
      <div className="discussion-detail-container" onClick={(e) => e.stopPropagation()}>
        <div className="discussion-detail__main">
          <div className="discussion-detail__post">
            <button className="discussion-detail__close-inline" onClick={onBack} aria-label="Đóng">
              <Icon name="close" size={24} />
            </button>
            <div className="discussion-detail__post-content">
              <div className="discussion-detail__post-meta">
                <div className="discussion-detail__workspace-group">
                  <img 
                    src={`https://api.dicebear.com/7.x/identicon/svg?seed=${workspaceId}`} 
                    alt="avatar" 
                    className="discussion-detail__workspace-avatar" 
                  />
                  <span>w/{workspaceId.substring(0, 8)}</span>
                  <button className="discussion-detail__join-btn">Tham gia</button>
                </div>
                <span>•</span>
                <span>Đăng bởi {discussion.authorName}</span>
                <span>•</span>
                <span>{formatTime(discussion.createdAt)}</span>
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

          <div className="discussion-detail__comments-section">
            <DiscussionReplyForm 
              loading={loading} 
              onSubmit={(body) => handleAddReply(body)} 
            />

            <h2 className="discussion-detail__replies-header">
              {replies.length} Trả lời
            </h2>

            <div className="discussion-replies-list">
              {(repliesByParent.get(null) || []).map((reply) => (
                <ReplyThread key={reply.id} reply={reply} />
              ))}
            </div>
          </div>
        </div>

        <aside className="discussion-detail__sidebar">
          <div className="discussion-sidebar-card">
            <div className="discussion-sidebar-card__header">
              <h3>Thông tin Workspace</h3>
            </div>
            <div className="discussion-sidebar-card__body">
              <p>Chào mừng bạn đến với cộng đồng tri thức này. Nơi đây tập hợp các thảo luận và câu hỏi xoay quanh tài liệu RAG.</p>
              <div className="discussion-sidebar-card__stats">
                <div className="stat">
                  <strong>{discussion.viewCount}</strong>
                  <span>Lượt xem</span>
                </div>
                <div className="stat">
                  <strong>{replies.length}</strong>
                  <span>Bình luận</span>
                </div>
              </div>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
};

export default DiscussionPage;
