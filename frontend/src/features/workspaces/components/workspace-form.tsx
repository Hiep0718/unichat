/**
 * Modal form for creating a new workspace.
 * Validates input with Zod before submission.
 */
import { useCallback, useId, useState } from 'react';

import { Icon } from '../../../components/icon';
import { useCreateWorkspace } from '../workspace-hooks';
import { createWorkspaceSchema } from '../workspace-schema';

import type { WorkspaceVisibility } from '../workspace-schema';

import './workspace-form.css';

interface WorkspaceFormProps {
  readonly open: boolean;
  readonly onClose: () => void;
}

const VISIBILITY_OPTIONS: readonly {
  value: WorkspaceVisibility;
  icon: string;
  label: string;
  desc: string;
}[] = [
  { value: 'PRIVATE', icon: 'lock', label: 'Riêng tư', desc: 'Chỉ bạn có quyền truy cập' },
  { value: 'SHARED', icon: 'group_add', label: 'Được chia sẻ', desc: 'Mời thành viên cụ thể' },
  { value: 'PUBLIC', icon: 'public', label: 'Công khai', desc: 'Ai cũng có thể xem' },
];

/**
 * Renders a modal dialog with a form to create a new workspace.
 */
export function WorkspaceForm({ open, onClose }: WorkspaceFormProps) {
  const formId = useId();
  const mutation = useCreateWorkspace();

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [visibility, setVisibility] = useState<WorkspaceVisibility>('PRIVATE');
  const [fieldError, setFieldError] = useState('');

  const resetForm = useCallback(() => {
    setName('');
    setDescription('');
    setVisibility('PRIVATE');
    setFieldError('');
    mutation.reset();
  }, [mutation]);

  const handleClose = useCallback(() => {
    resetForm();
    onClose();
  }, [resetForm, onClose]);

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      setFieldError('');

      const result = createWorkspaceSchema.safeParse({ name, description, visibility });
      if (!result.success) {
        const firstIssue = result.error.issues[0];
        setFieldError(firstIssue?.message ?? 'Dữ liệu không hợp lệ');
        return;
      }

      mutation.mutate(result.data, {
        onSuccess: () => handleClose(),
        onError: (err) => setFieldError(err.message),
      });
    },
    [name, description, visibility, mutation, handleClose],
  );

  if (!open) {
    return null;
  }

  return (
    <div className="modal-overlay" onClick={handleClose} role="presentation">
      <dialog
        className="modal-dialog"
        open
        aria-labelledby={`${formId}-title`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-dialog__header">
          <h2 id={`${formId}-title`} className="modal-dialog__title">
            Tạo Workspace Mới
          </h2>
          <button
            className="modal-dialog__close"
            type="button"
            aria-label="Đóng"
            onClick={handleClose}
          >
            <Icon name="close" size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="workspace-form">
          <div className="workspace-form__field">
            <label htmlFor={`${formId}-name`} className="workspace-form__label">
              Tên workspace <span className="workspace-form__required">*</span>
            </label>
            <input
              id={`${formId}-name`}
              className="workspace-form__input"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ví dụ: Tài liệu môn Trí tuệ nhân tạo"
              maxLength={100}
              autoFocus
            />
            <span className="workspace-form__hint">{name.length}/100 ký tự</span>
          </div>

          <div className="workspace-form__field">
            <label htmlFor={`${formId}-desc`} className="workspace-form__label">
              Mô tả
            </label>
            <textarea
              id={`${formId}-desc`}
              className="workspace-form__textarea"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Mô tả ngắn gọn về workspace này..."
              maxLength={1000}
              rows={3}
            />
            <span className="workspace-form__hint">{description.length}/1000 ký tự</span>
          </div>

          <fieldset className="workspace-form__fieldset">
            <legend className="workspace-form__label">Chế độ hiển thị</legend>
            <div className="workspace-form__visibility-options">
              {VISIBILITY_OPTIONS.map((opt) => (
                <label
                  key={opt.value}
                  className={`workspace-form__visibility-option ${
                    visibility === opt.value ? 'workspace-form__visibility-option--active' : ''
                  }`}
                >
                  <input
                    type="radio"
                    name="visibility"
                    value={opt.value}
                    checked={visibility === opt.value}
                    onChange={() => setVisibility(opt.value)}
                    className="visually-hidden"
                  />
                  <Icon name={opt.icon} size={20} />
                  <div>
                    <span className="workspace-form__visibility-label">{opt.label}</span>
                    <span className="workspace-form__visibility-desc">{opt.desc}</span>
                  </div>
                </label>
              ))}
            </div>
          </fieldset>

          {fieldError && (
            <div className="workspace-form__error" role="alert">
              <Icon name="error" size={16} />
              {fieldError}
            </div>
          )}

          <div className="workspace-form__actions">
            <button
              className="workspace-form__cancel-btn"
              type="button"
              onClick={handleClose}
            >
              Hủy
            </button>
            <button
              className="workspace-form__submit-btn"
              type="submit"
              disabled={mutation.isPending}
            >
              {mutation.isPending ? 'Đang tạo...' : 'Tạo Workspace'}
            </button>
          </div>
        </form>
      </dialog>
    </div>
  );
}
