/**
 * Workspace settings tab containing general, access, and danger zone sections.
 * Uses workspace data from parent and mutation hooks for updates.
 */

import { useCallback, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { Icon } from '../../components/icon';
import { useDeleteWorkspace, useUpdateWorkspace } from '../workspaces/workspace-hooks';

import type { WorkspaceDto, WorkspaceVisibility } from '../workspaces/workspace-schema';

import './settings.css';

interface WorkspaceSettingsProps {
  readonly workspace: WorkspaceDto | undefined;
  readonly isLoading: boolean;
  readonly workspaceId: string;
}

/**
 * Renders workspace settings with general, access, and danger zone sections.
 */
export function WorkspaceSettings({ workspace, isLoading, workspaceId }: WorkspaceSettingsProps) {
  if (isLoading || !workspace) {
    return <div className="settings-tab"><p>Đang tải cài đặt...</p></div>;
  }

  return (
    <div className="settings-tab">
      <GeneralForm workspace={workspace} workspaceId={workspaceId} />
      <AccessForm workspace={workspace} workspaceId={workspaceId} />
      <DangerZone workspace={workspace} workspaceId={workspaceId} />
    </div>
  );
}

/* ─── General Form ───────────────────────────────────────── */

function GeneralForm({
  workspace,
  workspaceId,
}: {
  readonly workspace: WorkspaceDto;
  readonly workspaceId: string;
}) {
  const [name, setName] = useState(workspace.name);
  const [description, setDescription] = useState(workspace.description);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const updateMutation = useUpdateWorkspace(workspaceId);

  const handleSave = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      setError('');
      setSuccess('');

      if (name.length < 3 || name.length > 100) {
        setError('Tên workspace phải từ 3 đến 100 ký tự');
        return;
      }

      updateMutation.mutate(
        { name, description, expectedVersion: workspace.version },
        {
          onSuccess: () => setSuccess('Cập nhật thành công!'),
          onError: (err) => setError(err.message),
        },
      );
    },
    [name, description, workspace.version, updateMutation],
  );

  return (
    <section className="settings-section">
      <h3 className="settings-section__title">Thông tin chung</h3>
      <form className="settings-form" onSubmit={handleSave}>
        <div className="settings-form__field">
          <label className="settings-form__label" htmlFor="settings-name">
            Tên workspace
          </label>
          <input
            id="settings-name"
            className="settings-form__input"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={100}
          />
        </div>
        <div className="settings-form__field">
          <label className="settings-form__label" htmlFor="settings-desc">
            Mô tả
          </label>
          <textarea
            id="settings-desc"
            className="settings-form__textarea"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            maxLength={1000}
            rows={3}
          />
        </div>
        {error && <p className="settings-form__error">{error}</p>}
        {success && <p className="settings-form__success">{success}</p>}
        <div className="settings-form__actions">
          <button
            className="settings-form__save-btn"
            type="submit"
            disabled={updateMutation.isPending}
          >
            <Icon name="save" size={16} />
            {updateMutation.isPending ? 'Đang lưu...' : 'Lưu thay đổi'}
          </button>
        </div>
      </form>
    </section>
  );
}

/* ─── Access Form ────────────────────────────────────────── */

const VISIBILITY_OPTIONS: {
  value: WorkspaceVisibility;
  title: string;
  description: string;
}[] = [
  { value: 'PRIVATE', title: 'Riêng tư', description: 'Chỉ thành viên được mời mới truy cập được' },
  { value: 'SHARED', title: 'Chia sẻ', description: 'Thành viên được mời có thể truy cập qua link' },
  { value: 'PUBLIC', title: 'Công khai', description: 'Bất kỳ ai đăng nhập đều có thể xem' },
];

function AccessForm({
  workspace,
  workspaceId,
}: {
  readonly workspace: WorkspaceDto;
  readonly workspaceId: string;
}) {
  const [visibility, setVisibility] = useState<WorkspaceVisibility>(workspace.visibility);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');

  const updateMutation = useUpdateWorkspace(workspaceId);

  const handleSave = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      setError('');
      setSuccess('');

      if (visibility === workspace.visibility) {
        setSuccess('Không có thay đổi');
        return;
      }

      updateMutation.mutate(
        { visibility, expectedVersion: workspace.version },
        {
          onSuccess: () => setSuccess('Cập nhật chế độ hiển thị thành công!'),
          onError: (err) => setError(err.message),
        },
      );
    },
    [visibility, workspace.visibility, workspace.version, updateMutation],
  );

  return (
    <section className="settings-section">
      <h3 className="settings-section__title">Chế độ hiển thị</h3>
      <form className="settings-form" onSubmit={handleSave}>
        <div className="settings-form__radio-group">
          {VISIBILITY_OPTIONS.map((opt) => (
            <label
              key={opt.value}
              className={`settings-form__radio-label ${visibility === opt.value ? 'settings-form__radio-label--selected' : ''}`}
            >
              <input
                className="settings-form__radio-input"
                type="radio"
                name="visibility"
                value={opt.value}
                checked={visibility === opt.value}
                onChange={() => setVisibility(opt.value)}
              />
              <div className="settings-form__radio-info">
                <span className="settings-form__radio-title">{opt.title}</span>
                <span className="settings-form__radio-desc">{opt.description}</span>
              </div>
            </label>
          ))}
        </div>
        {error && <p className="settings-form__error">{error}</p>}
        {success && <p className="settings-form__success">{success}</p>}
        <div className="settings-form__actions">
          <button
            className="settings-form__save-btn"
            type="submit"
            disabled={updateMutation.isPending}
          >
            <Icon name="save" size={16} />
            {updateMutation.isPending ? 'Đang lưu...' : 'Lưu thay đổi'}
          </button>
        </div>
      </form>
    </section>
  );
}

/* ─── Danger Zone ────────────────────────────────────────── */

function DangerZone({
  workspace,
  workspaceId,
}: {
  readonly workspace: WorkspaceDto;
  readonly workspaceId: string;
}) {
  const [showConfirm, setShowConfirm] = useState(false);
  const [confirmText, setConfirmText] = useState('');
  const navigate = useNavigate();

  const deleteMutation = useDeleteWorkspace();

  const handleDelete = useCallback(() => {
    deleteMutation.mutate(workspaceId, {
      onSuccess: () => navigate('/workspaces'),
    });
  }, [workspaceId, deleteMutation, navigate]);

  const canConfirm = confirmText === workspace.name;

  return (
    <section className="settings-section settings-section--danger">
      <h3 className="settings-section__title settings-section__title--danger">
        Vùng nguy hiểm
      </h3>
      <p className="settings-section__description">
        Xóa workspace sẽ xóa vĩnh viễn tất cả tài liệu, cuộc trò chuyện và thành viên. Hành động này không thể hoàn tác.
      </p>
      <button
        className="danger-zone__delete-btn"
        type="button"
        onClick={() => setShowConfirm(true)}
      >
        <Icon name="delete_forever" size={18} />
        Xóa workspace
      </button>

      {showConfirm && (
        <div className="danger-zone__overlay" onClick={() => setShowConfirm(false)} role="presentation">
          <div
            className="danger-zone__modal"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
          >
            <h3 className="danger-zone__modal-title">Xác nhận xóa workspace</h3>
            <p className="danger-zone__modal-text">
              Nhập <strong>{workspace.name}</strong> để xác nhận xóa vĩnh viễn workspace này.
            </p>
            <input
              className="danger-zone__confirm-input"
              type="text"
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              placeholder={workspace.name}
              autoFocus
            />
            <div className="danger-zone__modal-actions">
              <button
                className="danger-zone__cancel-btn"
                type="button"
                onClick={() => setShowConfirm(false)}
              >
                Hủy
              </button>
              <button
                className="danger-zone__confirm-btn"
                type="button"
                disabled={!canConfirm || deleteMutation.isPending}
                onClick={handleDelete}
              >
                {deleteMutation.isPending ? 'Đang xóa...' : 'Xóa vĩnh viễn'}
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
