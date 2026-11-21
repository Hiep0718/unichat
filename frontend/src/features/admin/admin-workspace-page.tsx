import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { Icon } from '../../components/icon';
import { deleteAdminWorkspace, fetchAdminWorkspaces, toggleWorkspaceVisibility } from './admin-api';

import type { AdminWorkspaceItem } from './admin-api';

const QUERY_KEY = ['admin', 'workspaces'] as const;

/** What each visibility level is called, with the badge it is drawn as. */
const VISIBILITY: Record<AdminWorkspaceItem['visibility'], { label: string; icon: string; badge: string }> = {
  PUBLIC: { label: 'Công khai', icon: 'public', badge: 'admin-badge--success' },
  SHARED: { label: 'Chia sẻ', icon: 'group', badge: 'admin-badge--neutral' },
  PRIVATE: { label: 'Riêng tư', icon: 'lock', badge: 'admin-badge--neutral' },
};

/** The level a moderator toggles to: a public group is closed, anything else is opened. */
const nextVisibilityOf = (current: AdminWorkspaceItem['visibility']) =>
  current === 'PUBLIC' ? 'PRIVATE' : 'PUBLIC';

const messageOf = (error: unknown, fallback: string) =>
  error instanceof Error && error.message ? error.message : fallback;

interface RowProps {
  readonly workspace: AdminWorkspaceItem;
  readonly busy: boolean;
  readonly onToggle: (workspace: AdminWorkspaceItem) => void;
  readonly onDelete: (workspace: AdminWorkspaceItem) => void;
}

function WorkspaceRow({ workspace, busy, onToggle, onDelete }: RowProps) {
  const level = VISIBILITY[workspace.visibility];
  const next = VISIBILITY[nextVisibilityOf(workspace.visibility)];
  return (
    <tr>
      <td className="admin-page__cell-strong">{workspace.name}</td>
      <td>
        <span className={`admin-badge ${level.badge}`}>
          <Icon name={level.icon} size={14} />
          {level.label}
        </span>
      </td>
      <td>{workspace.documentCount} tài liệu</td>
      <td>{new Date(workspace.createdAt).toLocaleDateString('vi-VN')}</td>
      <td>
        <div className="admin-page__actions">
          <button type="button" className="admin-page__action" disabled={busy} onClick={() => onToggle(workspace)}>
            Đổi sang {next.label}
          </button>
          <button type="button" className="admin-page__action admin-page__action--danger" disabled={busy}
            onClick={() => onDelete(workspace)}>
            <Icon name="delete" size={14} />
            Xóa
          </button>
        </div>
      </td>
    </tr>
  );
}

/** Lets an administrator moderate any group's visibility or remove it. */
export function AdminWorkspacePage() {
  const queryClient = useQueryClient();
  const [actionError, setActionError] = useState<string | null>(null);
  const { data, error, isPending } = useQuery({
    queryKey: QUERY_KEY,
    queryFn: () => fetchAdminWorkspaces(0, 50),
  });
  const refresh = () => queryClient.invalidateQueries({ queryKey: QUERY_KEY });

  const toggle = useMutation({
    mutationFn: (w: AdminWorkspaceItem) => toggleWorkspaceVisibility(w.id, nextVisibilityOf(w.visibility)),
    onSuccess: refresh,
    onError: (err) => setActionError(messageOf(err, 'Không thể đổi chế độ hiển thị.')),
  });
  const remove = useMutation({
    mutationFn: (w: AdminWorkspaceItem) => deleteAdminWorkspace(w.id),
    onSuccess: refresh,
    onError: (err) => setActionError(messageOf(err, 'Không thể xóa nhóm.')),
  });

  const handleToggle = (w: AdminWorkspaceItem) => {
    const next = VISIBILITY[nextVisibilityOf(w.visibility)].label;
    if (!window.confirm(`Đổi nhóm "${w.name}" sang chế độ ${next}?`)) return;
    setActionError(null);
    toggle.mutate(w);
  };
  const handleDelete = (w: AdminWorkspaceItem) => {
    if (!window.confirm(`Xóa nhóm "${w.name}"? Tài liệu và dữ liệu vector của nhóm sẽ được giải phóng.`)) return;
    setActionError(null);
    remove.mutate(w);
  };

  const workspaces = data?.content ?? [];
  const busy = toggle.isPending || remove.isPending;

  return (
    <section className="admin-page">
      <header className="admin-page__header">
        <h2>Quản trị nhóm</h2>
        <p>Theo dõi mọi nhóm trong hệ thống, đổi chế độ hiển thị hoặc gỡ nhóm vi phạm nội quy.</p>
      </header>

      {isPending && <p className="admin-page__notice" role="status">Đang tải danh sách nhóm…</p>}
      {error && <p className="admin-page__error" role="alert">{messageOf(error, 'Không tải được danh sách nhóm.')}</p>}
      {actionError && <p className="admin-page__error" role="alert">{actionError}</p>}

      <div className="admin-page__card">
        <table>
          <thead>
            <tr><th>Tên nhóm</th><th>Chế độ</th><th>Số tài liệu</th><th>Ngày tạo</th><th>Thao tác</th></tr>
          </thead>
          <tbody>
            {workspaces.map((w) => (
              <WorkspaceRow key={w.id} workspace={w} busy={busy} onToggle={handleToggle} onDelete={handleDelete} />
            ))}
          </tbody>
        </table>
        {!isPending && !error && workspaces.length === 0 && (
          <p className="admin-page__empty">Chưa có nhóm nào.</p>
        )}
      </div>
    </section>
  );
}

export default AdminWorkspacePage;
