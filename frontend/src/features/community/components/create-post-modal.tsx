/**
 * Create Post Modal with workspace selector (Reddit-style).
 * Used on FeedPage to create a new discussion across any joined workspace.
 */
import { useState, useEffect } from 'react';

import { Icon } from '../../../components/icon';
import { getWorkspaces } from '../../workspaces/workspace-api';
import type { WorkspaceDto } from '../../workspaces/workspace-schema';
import { createDiscussion } from '../community-api';
import '../discussion-page.css';

interface CreatePostModalProps {
  readonly onClose: () => void;
  readonly onCreated: (workspaceId: string, discussionId: string) => void;
  readonly preselectedWorkspaceId?: string;
}

/**
 * Renders a full-screen modal for creating a new community post.
 * Fetches the user's joined workspaces for the workspace dropdown.
 */
export function CreatePostModal({ onClose, onCreated, preselectedWorkspaceId }: CreatePostModalProps) {
  const [workspaces, setWorkspaces] = useState<WorkspaceDto[]>([]);
  const [selectedWsId, setSelectedWsId] = useState(preselectedWorkspaceId ?? '');
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [label, setLabel] = useState('DISCUSSION');
  const [loading, setLoading] = useState(false);
  const [wsLoading, setWsLoading] = useState(true);

  useEffect(() => {
    setWsLoading(true);
    getWorkspaces(0, 100)
      .then((page) => {
        setWorkspaces([...page.content]);
        if (!preselectedWorkspaceId && page.content.length > 0) {
          const first = page.content[0];
          if (first) {
            setSelectedWsId(first.id);
          }
        }
      })
      .catch(() => setWorkspaces([]))
      .finally(() => setWsLoading(false));
  }, [preselectedWorkspaceId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !body.trim() || !selectedWsId) return;
    setLoading(true);
    try {
      const result = await createDiscussion(selectedWsId, {
        title: title.trim(),
        body: body.trim(),
        label,
      });
      onCreated(selectedWsId, result.id);
    } catch {
      /* toast error would go here */
    } finally {
      setLoading(false);
    }
  };

  const selectedWs = workspaces.find((w) => w.id === selectedWsId);

  return (
    <div className="create-post-overlay" onClick={onClose}>
      <div className="create-post-modal" onClick={(e) => e.stopPropagation()}>
        <div className="create-post-modal__header">
          <h2 className="create-post-modal__title">Tạo bài viết mới</h2>
          <button className="create-post-modal__close" onClick={onClose}>
            <Icon name="close" size={20} />
          </button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="create-post-modal__body">
            {/* Workspace selector */}
            <div className="create-post-modal__field">
              <label className="create-post-modal__label">
                <Icon name="workspaces" size={16} /> Chọn Knowledge Space
              </label>
              {wsLoading ? (
                <div className="create-post-modal__ws-loading">Đang tải...</div>
              ) : workspaces.length === 0 ? (
                <div className="create-post-modal__ws-empty">
                  Bạn chưa tham gia workspace nào. Hãy tham gia một workspace trước.
                </div>
              ) : (
                <select
                  className="create-post-modal__select"
                  value={selectedWsId}
                  onChange={(e) => setSelectedWsId(e.target.value)}
                  required
                >
                  {workspaces.map((ws) => (
                    <option key={ws.id} value={ws.id}>
                      {ws.name}
                    </option>
                  ))}
                </select>
              )}
              {selectedWs && (
                <span className="create-post-modal__ws-hint">
                  Bài viết sẽ đăng vào: {selectedWs.name}
                </span>
              )}
            </div>

            {/* Label selector */}
            <div className="create-post-modal__field">
              <label className="create-post-modal__label">Loại bài viết</label>
              <div className="create-post-modal__label-pills">
                {(['QUESTION', 'DISCUSSION', 'ANNOUNCEMENT'] as const).map((l) => (
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
                ))}
              </div>
            </div>

            {/* Title */}
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
              <span className="create-post-modal__char-count">{title.length}/200</span>
            </div>

            {/* Body */}
            <div className="create-post-modal__field">
              <label className="create-post-modal__label">Nội dung</label>
              <textarea
                className="create-post-modal__textarea"
                value={body}
                onChange={(e) => setBody(e.target.value)}
                placeholder="Viết nội dung bài thảo luận... (Gõ @AI để yêu cầu AI trả lời)"
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
              disabled={loading || !title.trim() || !body.trim() || !selectedWsId}
            >
              {loading ? 'Đang đăng...' : 'Đăng bài'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
