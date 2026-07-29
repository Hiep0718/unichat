import { useState } from 'react';
import { useForm } from 'react-hook-form';

import { createWorkspaceSchema, CreateWorkspaceFormValues } from '../workspace-schema';
import { createWorkspace, WorkspaceResponse, CreateWorkspacePayload } from '../workspace-api';
import './create-workspace-modal.css';

interface CreateWorkspaceModalProps {
  readonly isOpen: boolean;
  readonly onClose: () => void;
  readonly onSuccess: (workspace: WorkspaceResponse) => void;
}

export function CreateWorkspaceModal({ isOpen, onClose, onSuccess }: CreateWorkspaceModalProps) {
  const [submitting, setSubmitting] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<CreateWorkspaceFormValues>({
    defaultValues: {
      name: '',
      description: '',
      visibility: 'PRIVATE',
    },
  });

  if (!isOpen) return null;

  const onSubmit = async (values: CreateWorkspaceFormValues) => {
    setSubmitting(true);
    setApiError(null);

    const parsed = createWorkspaceSchema.safeParse(values);
    if (!parsed.success) {
      setSubmitting(false);
      setApiError(parsed.error.issues[0]?.message || 'Dữ liệu không hợp lệ');
      return;
    }

    try {
      const payload: CreateWorkspacePayload = {
        name: parsed.data.name,
        visibility: parsed.data.visibility,
      };
      if (parsed.data.description) {
        payload.description = parsed.data.description;
      }

      const created = await createWorkspace(payload);
      reset();
      onSuccess(created);
      onClose();
    } catch (err: unknown) {
      setApiError(err instanceof Error ? err.message : 'Không thể tạo Workspace');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3 className="modal-title">Tạo Workspace mới</h3>
          <button className="modal-close-btn" type="button" onClick={onClose}>
            &times;
          </button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)}>
          <div className="modal-body">
            {apiError && <div className="form-error" style={{ marginBottom: '1rem' }}>{apiError}</div>}

            <div className="form-group">
              <label className="form-label" htmlFor="name">
                Tên Workspace <span style={{ color: '#e11d48' }}>*</span>
              </label>
              <input
                id="name"
                className="form-input"
                type="text"
                placeholder="Nhập tên workspace (ví dụ: Nghiên cứu sinh AI 2026)"
                {...register('name', { required: 'Tên Workspace là bắt buộc' })}
              />
              {errors.name && <p className="form-error">{errors.name.message}</p>}
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="description">
                Mô tả Workspace
              </label>
              <textarea
                id="description"
                className="form-textarea"
                rows={3}
                placeholder="Mô tả mục đích, phạm vi tài liệu..."
                {...register('description')}
              />
              {errors.description && <p className="form-error">{errors.description.message}</p>}
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="visibility">
                Quyền truy cập <span style={{ color: '#e11d48' }}>*</span>
              </label>
              <select id="visibility" className="form-select" {...register('visibility')}>
                <option value="PRIVATE">Riêng tư (Chỉ mình tôi)</option>
                <option value="SHARED">Được chia sẻ (Thành viên được mời)</option>
                <option value="PUBLIC">Công khai (Tất cả người dùng đã đăng nhập)</option>
              </select>
              {errors.visibility && <p className="form-error">{errors.visibility.message}</p>}
            </div>
          </div>

          <div className="modal-footer">
            <button className="btn-secondary" type="button" onClick={onClose} disabled={submitting}>
              Hủy
            </button>
            <button className="btn-primary" type="submit" disabled={submitting}>
              {submitting ? 'Đang tạo...' : 'Tạo Workspace'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
