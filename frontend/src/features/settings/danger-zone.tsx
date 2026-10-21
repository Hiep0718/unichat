import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { Icon } from '../../components/icon';
import { useDeleteWorkspace } from '../workspaces/workspace-hooks';

import type { SettingsWorkspace } from './use-settings-save';

/** Preserves explicit name confirmation before the owner deletes a workspace. */
export function DangerZone({ workspace }: { readonly workspace: SettingsWorkspace }) {
  const [showConfirm, setShowConfirm] = useState(false);
  const [confirmText, setConfirmText] = useState('');
  const navigate = useNavigate();
  const mutation = useDeleteWorkspace();
  const handleDelete = () => {
    if (confirmText !== workspace.name || mutation.isPending) return;
    mutation.mutate(workspace.id, { onSuccess: () => navigate('/workspaces') });
  };

  return (
    <section className="settings-section settings-section--danger">
      <h3 className="settings-section__title settings-section__title--danger">Vùng nguy hiểm</h3>
      <p className="settings-section__description">
        Xóa workspace sẽ xóa vĩnh viễn tất cả tài liệu, cuộc trò chuyện và thành viên. Hành động này không thể hoàn tác.
      </p>
      <button className="danger-zone__delete-btn" type="button" onClick={() => setShowConfirm(true)}>
        <Icon name="delete_forever" size={18} />Xóa workspace
      </button>
      {showConfirm && <div className="danger-zone__overlay" role="presentation">
        <div className="danger-zone__modal" role="dialog" aria-modal="true" aria-labelledby="delete-title">
          <h3 id="delete-title" className="danger-zone__modal-title">Xác nhận xóa workspace</h3>
          <label className="danger-zone__modal-text">Nhập {workspace.name} để xác nhận xóa vĩnh viễn workspace này.
            <input className="danger-zone__confirm-input" value={confirmText}
              onChange={(event) => setConfirmText(event.target.value)} placeholder={workspace.name} />
          </label>
          {mutation.isError && <p role="alert">Không thể xóa workspace. Vui lòng thử lại.</p>}
          <div className="danger-zone__modal-actions">
            <button className="danger-zone__cancel-btn" type="button" onClick={() => setShowConfirm(false)} disabled={mutation.isPending}>Hủy</button>
            <button className="danger-zone__confirm-btn" type="button"
              disabled={confirmText !== workspace.name || mutation.isPending} onClick={handleDelete}>
              {mutation.isPending ? 'Đang xóa...' : 'Xóa vĩnh viễn'}
            </button>
          </div>
        </div>
      </div>}
    </section>
  );
}
