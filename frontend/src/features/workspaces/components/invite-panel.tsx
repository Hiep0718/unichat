/**
 * The invite links a workspace has issued, on the access settings.
 *
 * Only management lives here — reading usage and revoking. Issuing a link moved
 * into the "Mời thành viên" dialog, beside the email invite, because inviting is
 * an everyday job and settings is the page nobody visits to do one.
 */
import { useState } from 'react';

import { useInvites, useRevokeInvite } from '../invite-hooks';
import { allowsMembers } from '../workspace-visibility';

import type { InviteDto } from '../invite-api';
import type { WorkspaceRole, WorkspaceVisibility } from '../workspace-schema';

import './invite-panel.css';

interface InvitePanelProps {
  readonly workspaceId: string;
  readonly visibility: WorkspaceVisibility;
}

const ROLE_SHORT: Record<WorkspaceRole, string> = {
  OWNER: 'Chủ sở hữu',
  EDITOR: 'Biên tập viên',
  VIEWER: 'Thành viên',
};

/** Formats an ISO instant as a Vietnamese date and time. */
function formatMoment(iso: string): string {
  return new Date(iso).toLocaleString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/** Lists the workspace's links with their usage and a revoke action. */
export function InvitePanel({ workspaceId, visibility }: InvitePanelProps) {
  const canInvite = allowsMembers(visibility);
  const { data: invites = [], error: loadError } = useInvites(workspaceId, canInvite);
  const revoke = useRevokeInvite(workspaceId);
  const [error, setError] = useState<string | null>(null);

  const handleRevoke = (inviteId: string) => {
    if (!window.confirm('Thu hồi link này? Ai đang giữ link sẽ không dùng được nữa.')) return;
    setError(null);
    revoke.mutate(inviteId, {
      onError: (err) => setError(err.message || 'Không thu hồi được link'),
    });
  };

  if (!canInvite) {
    return (
      <p className="invite-panel__disabled">
        Nhóm riêng tư không tạo được link mời. Hãy chuyển sang chế độ Chia sẻ trước.
      </p>
    );
  }

  const shownError = error ?? (loadError ? 'Không tải được danh sách link mời' : null);
  return (
    <div className="invite-panel">
      <p className="invite-panel__intro">
        Tạo link mới bằng nút <strong>Mời thành viên</strong> → tab <strong>Qua link</strong>.
        Ở đây bạn xem lượt dùng và thu hồi các link đã tạo.
      </p>
      {shownError && <p className="invite-panel__error" role="alert">{shownError}</p>}
      {invites.length === 0 && !loadError && (
        <p className="invite-panel__empty">Chưa có link mời nào.</p>
      )}
      {invites.length > 0 && (
        <ul className="invite-panel__list">
          {invites.map((invite) => (
            <InviteRow key={invite.id} invite={invite} onRevoke={handleRevoke} />
          ))}
        </ul>
      )}
    </div>
  );
}

/** One link: who it admits, how much it has been used, and when it ends. */
function InviteRow({ invite, onRevoke }: { readonly invite: InviteDto; readonly onRevoke: (id: string) => void }) {
  return (
    <li className={invite.active ? '' : 'invite-panel__item--dead'}>
      <span className="invite-panel__item-role">{ROLE_SHORT[invite.role]}</span>
      <span className="invite-panel__item-meta">
        {invite.usedCount}/{invite.maxUses} lượt · hết hạn {formatMoment(invite.expiresAt)}
        {!invite.active && ' · đã ngừng'}
      </span>
      {invite.active && (
        <button type="button" onClick={() => onRevoke(invite.id)}>
          Thu hồi
        </button>
      )}
    </li>
  );
}
