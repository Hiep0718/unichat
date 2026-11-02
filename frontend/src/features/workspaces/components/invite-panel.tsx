/**
 * Issuing and revoking invite links, on the workspace access settings.
 *
 * Sits beside the member table because the two are the same job reached two
 * ways: the table admits people who already have an account, this admits the
 * ones who do not — and the ones Work Chat cannot reach, since Work Chat only
 * reaches people who already share a workspace with you.
 */
import { useCallback, useEffect, useState } from 'react';

import { Icon } from '../../../components/icon';
import { createInvite, getInvites, inviteUrlFor, revokeInvite } from '../invite-api';
import { allowsMembers, ROLE_SUMMARY } from '../workspace-visibility';

import type { InviteDto } from '../invite-api';
import type { WorkspaceRole, WorkspaceVisibility } from '../workspace-schema';

import './invite-panel.css';

interface InvitePanelProps {
  readonly workspaceId: string;
  readonly visibility: WorkspaceVisibility;
}

const EXPIRY_CHOICES = [1, 7, 30] as const;

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

export function InvitePanel({ workspaceId, visibility }: InvitePanelProps) {
  const [invites, setInvites] = useState<readonly InviteDto[]>([]);
  const [role, setRole] = useState<WorkspaceRole>('VIEWER');
  const [expiresInDays, setExpiresInDays] = useState<number>(7);
  const [maxUses, setMaxUses] = useState<number>(1);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  /** Held in state, not refetched: the server cannot show a token twice. */
  const [freshLink, setFreshLink] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const canInvite = allowsMembers(visibility);

  const reload = useCallback(() => {
    getInvites(workspaceId)
      .then(setInvites)
      .catch(() => setInvites([]));
  }, [workspaceId]);

  useEffect(() => {
    if (canInvite) reload();
  }, [canInvite, reload]);

  const handleCreate = async () => {
    setCreating(true);
    setError(null);
    try {
      const invite = await createInvite(workspaceId, { role, expiresInDays, maxUses });
      // The token exists only in this response; losing it means issuing a new link.
      setFreshLink(invite.token ? inviteUrlFor(invite.token) : null);
      setCopied(false);
      reload();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Không tạo được link mời');
    } finally {
      setCreating(false);
    }
  };

  const handleCopy = async () => {
    if (!freshLink) return;
    try {
      await navigator.clipboard.writeText(freshLink);
      setCopied(true);
    } catch {
      // Clipboard access is refused in some browsers and over plain HTTP; the
      // link stays selectable on screen, so this is not worth an error banner.
      setCopied(false);
    }
  };

  const handleRevoke = async (inviteId: string) => {
    if (!confirm('Thu hồi link này? Ai đang giữ link sẽ không dùng được nữa.')) return;
    try {
      await revokeInvite(workspaceId, inviteId);
      reload();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Không thu hồi được link');
    }
  };

  if (!canInvite) {
    return (
      <p className="invite-panel__disabled">
        Workspace riêng tư không tạo được link mời. Hãy chuyển sang chế độ Chia sẻ trước.
      </p>
    );
  }

  return (
    <div className="invite-panel">
      <p className="invite-panel__intro">
        Link mời dùng được cho cả người chưa có tài khoản UniChat. Bạn gửi link qua
        bất kỳ kênh nào — Zalo, email, lớp học — và người nhận tự tham gia.
      </p>

      {error && (
        <p className="invite-panel__error" role="alert">
          {error}
        </p>
      )}

      <div className="invite-panel__controls">
        <label className="invite-panel__field">
          <span>Vai trò</span>
          <select value={role} onChange={(e) => setRole(e.target.value as WorkspaceRole)}>
            <option value="VIEWER">{ROLE_SUMMARY.VIEWER}</option>
            <option value="EDITOR">{ROLE_SUMMARY.EDITOR}</option>
          </select>
        </label>

        <label className="invite-panel__field">
          <span>Hết hạn sau</span>
          <select
            value={expiresInDays}
            onChange={(e) => setExpiresInDays(Number(e.target.value))}
          >
            {EXPIRY_CHOICES.map((days) => (
              <option key={days} value={days}>
                {days} ngày
              </option>
            ))}
          </select>
        </label>

        <label className="invite-panel__field">
          <span>Số lượt dùng</span>
          <input
            type="number"
            min={1}
            max={200}
            value={maxUses}
            onChange={(e) => setMaxUses(Math.max(1, Math.min(200, Number(e.target.value))))}
          />
        </label>

        <button
          type="button"
          className="invite-panel__create"
          onClick={handleCreate}
          disabled={creating}
        >
          {creating ? 'Đang tạo…' : 'Tạo link mời'}
        </button>
      </div>

      {freshLink && (
        <div className="invite-panel__fresh">
          <p className="invite-panel__fresh-note">
            <Icon name="warning" size={16} />
            Sao chép ngay — link chỉ hiện một lần duy nhất và không xem lại được.
          </p>
          <div className="invite-panel__fresh-row">
            <input readOnly value={freshLink} onFocus={(e) => e.target.select()} />
            <button type="button" onClick={handleCopy}>
              {copied ? 'Đã chép' : 'Sao chép'}
            </button>
          </div>
        </div>
      )}

      {invites.length > 0 && (
        <ul className="invite-panel__list">
          {invites.map((invite) => (
            <li key={invite.id} className={invite.active ? '' : 'invite-panel__item--dead'}>
              <span className="invite-panel__item-role">{invite.role}</span>
              <span className="invite-panel__item-meta">
                {invite.usedCount}/{invite.maxUses} lượt · hết hạn {formatMoment(invite.expiresAt)}
                {!invite.active && ' · đã ngừng'}
              </span>
              {invite.active && (
                <button type="button" onClick={() => handleRevoke(invite.id)}>
                  Thu hồi
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
