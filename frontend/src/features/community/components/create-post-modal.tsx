/**
 * Create Post Modal with workspace selector (Reddit-style).
 * Used on FeedPage to create a new discussion across any joined workspace.
 */
import { useEffect, useRef, useState } from 'react';

import { Icon } from '../../../components/icon';
import { getWorkspaces } from '../../workspaces/workspace-api';
import type { WorkspaceDto } from '../../workspaces/workspace-schema';
import { ApiError } from '../../../lib/api-client';
import { createDiscussion, uploadPostAttachment } from '../community-api';
import { BackgroundPicker } from './background-picker';
import { PostBackgroundPanel } from './post-background-panel';
import { canUseBackground } from '../post-background';
import { ComposeSuggestions } from './compose-suggestions';
import { MentionTextarea } from './mention-textarea';
import './create-post-modal.css';

interface CreatePostModalProps {
  readonly onClose: () => void;
  readonly onCreated: (workspaceId: string, discussionId: string) => void;
  /**
   * Opens an existing post the composer suggested. Distinct from `onCreated`:
   * nothing was posted, so a caller must not treat it as a new post.
   */
  readonly onOpenExisting: (workspaceId: string, discussionId: string) => void;
  readonly preselectedWorkspaceId?: string;
  /** Pre-filled title, e.g. when escalating an unanswered question from chat. */
  readonly initialTitle?: string;
  /** Pre-filled body. */
  readonly initialBody?: string;
  /** Pre-selected post label. Defaults to DISCUSSION. */
  readonly initialLabel?: string;
  /** Overrides the modal heading to match the originating flow. */
  readonly heading?: string;
}

/**
 * Renders a full-screen modal for creating a new community post.
 * Fetches the user's joined workspaces for the workspace dropdown.
 */
export function CreatePostModal({
  onClose,
  onCreated,
  onOpenExisting,
  preselectedWorkspaceId,
  initialTitle,
  initialBody,
  initialLabel,
  heading,
}: CreatePostModalProps) {
  const [workspaces, setWorkspaces] = useState<WorkspaceDto[]>([]);
  const [selectedWsId, setSelectedWsId] = useState(preselectedWorkspaceId ?? '');
  const [title, setTitle] = useState(initialTitle ?? '');
  const [body, setBody] = useState(initialBody ?? '');
  const [label, setLabel] = useState(initialLabel ?? 'DISCUSSION');
  const [loading, setLoading] = useState(false);
  const [wsLoading, setWsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [files, setFiles] = useState<File[]>([]);
  const [backgroundKey, setBackgroundKey] = useState<string | null>(null);
  const [uploadingName, setUploadingName] = useState<string | null>(null);
  const [uploadPercent, setUploadPercent] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  // A gradient is only readable behind a line or two, and a photo grid on top
  // of one is noise — so the option withdraws instead of producing a bad post.
  const canShowBackground = files.length === 0 && canUseBackground(body);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !body.trim() || !selectedWsId) return;
    setLoading(true);
    setError(null);
    try {
      const result = await createDiscussion(selectedWsId, {
        title: title.trim(),
        body: body.trim(),
        label,
        // Sent only when it still applies, so a background chosen before the
        // post grew past the limit is dropped rather than rejected.
        backgroundKey: canShowBackground ? backgroundKey : null,
      });

      // Attachments need the post id, so they are uploaded once it exists.
      // A failure here must not lose the post that was already created.
      for (const file of files) {
        setUploadingName(file.name);
        await uploadPostAttachment(selectedWsId, result.id, file, setUploadPercent);
      }

      onCreated(selectedWsId, result.id);
    } catch (err: unknown) {
      // Surfacing the failure matters: silently swallowing it made the modal
      // look like it had done nothing at all.
      const detail = err instanceof Error ? err.message : 'Không rõ nguyên nhân';
      const status = err instanceof ApiError ? ` (HTTP ${err.status})` : '';
      setError(`Đăng bài thất bại${status}: ${detail}`);
    } finally {
      setLoading(false);
    }
  };

  const selectedWs = workspaces.find((w) => w.id === selectedWsId);
  const canMakeAnnouncement = selectedWs?.userRole === 'OWNER' || selectedWs?.userRole === 'EDITOR';

  useEffect(() => {
    if (label === 'ANNOUNCEMENT' && !canMakeAnnouncement) {
      setLabel('DISCUSSION');
    }
  }, [selectedWsId, canMakeAnnouncement, label]);

  return (
    <div className="create-post-overlay" onClick={onClose}>
      <div className="create-post-modal" onClick={(e) => e.stopPropagation()}>
        <div className="create-post-modal__header">
          <h2 className="create-post-modal__title">{heading ?? 'Tạo bài viết mới'}</h2>
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
              {selectedWsId && (
                <ComposeSuggestions
                  workspaceId={selectedWsId}
                  draft={title}
                  onOpenPost={(discussionId) => onOpenExisting(selectedWsId, discussionId)}
                />
              )}
            </div>

            {/* Body */}
            <div className="create-post-modal__field">
              <label className="create-post-modal__label">Nội dung</label>
              <MentionTextarea
                workspaceId={selectedWsId}
                className="create-post-modal__textarea"
                value={body}
                onChange={setBody}
                placeholder="Viết nội dung... (@AI để hỏi trợ lý, @tên để nhắc thành viên)"
                rows={6}
                required
              />

              {/* Shown as it will be posted, because a colour chosen from a
                  32px swatch is not the same decision as one seen behind the
                  actual words. */}
              {backgroundKey && canShowBackground && (
                <PostBackgroundPanel backgroundKey={backgroundKey} body={body} compact />
              )}
            </div>
          </div>
          <div className="create-post-modal__attachments">
            <button
              type="button"
              className="create-post-modal__attach-btn"
              onClick={() => fileInputRef.current?.click()}
              disabled={loading}
            >
              <Icon name="attach_file" size={17} />
              Đính kèm ảnh hoặc tài liệu
            </button>
            <BackgroundPicker
              value={backgroundKey}
              onChange={setBackgroundKey}
              visible={canShowBackground}
            />

            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept=".png,.jpg,.jpeg,.webp,.gif,.pdf,.docx,.txt"
              style={{ display: 'none' }}
              onChange={(e) => {
                setFiles((prev) => [...prev, ...Array.from(e.target.files ?? [])]);
                e.target.value = '';
              }}
            />

            {files.length > 0 && (
              <ul className="create-post-modal__file-list">
                {files.map((file, index) => (
                  <li key={`${file.name}-${index}`}>
                    <Icon
                      name={file.type.startsWith('image/') ? 'image' : 'description'}
                      size={16}
                    />
                    <span className="create-post-modal__file-name">{file.name}</span>
                    {uploadingName === file.name ? (
                      <span className="create-post-modal__file-progress">{uploadPercent}%</span>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setFiles((prev) => prev.filter((_, i) => i !== index))}
                        aria-label={`Bỏ ${file.name}`}
                        disabled={loading}
                      >
                        <Icon name="close" size={14} />
                      </button>
                    )}
                  </li>
                ))}
              </ul>
            )}

            <p className="create-post-modal__attach-hint">
              Tài liệu PDF, DOCX, TXT sẽ vào thư viện của nhóm để trợ lý AI đọc được.
              Ảnh chỉ hiển thị trong bài viết.
            </p>
          </div>

          {error && (
            <div className="create-post-modal__error" role="alert">
              <Icon name="error_outline" size={18} />
              <span>{error}</span>
            </div>
          )}

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
