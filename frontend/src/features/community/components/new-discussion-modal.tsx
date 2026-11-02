/**
 * The form for writing a new post in a group.
 *
 * Lives beside the list rather than inside it: it is a separate task with its
 * own fields, validation and submit, and keeping it in the page file made that
 * file longer than the limit the project sets for one.
 */
import { useState, useEffect } from 'react';

import { Icon } from '../../../components/icon';
import { useWorkspace } from '../../workspaces/workspace-context';
import { createDiscussion } from '../community-api';

import type { DiscussionResponse } from '../community-api';
import './create-post-modal.css';

interface NewDiscussionModalProps {
  workspaceId: string;
  onClose: () => void;
  onCreate: (d: DiscussionResponse) => void;
}

export function NewDiscussionModal({ workspaceId, onClose, onCreate }: NewDiscussionModalProps) {
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
