/**
 * Issuing one invite link, from the "Qua link" tab of the invite dialog.
 *
 * One click with sensible defaults produces a link; the expiry and use limit
 * are folded away because most owners never change them. The token exists only
 * in the creation response, so the link is copied straight away and the owner
 * is warned before closing if it was not.
 */
import { useEffect, useRef, useState } from 'react';

import { Icon } from '../../../components/icon';
import { SelectMenu } from '../../../components/select-menu';
import { copyText } from '../../../lib/copy-text';
import { inviteUrlFor } from '../invite-api';
import { useCreateInvite } from '../invite-hooks';
import { ROLE_SUMMARY } from '../workspace-visibility';

import type { WorkspaceRole } from '../workspace-schema';

import './invite-link-creator.css';

interface InviteLinkCreatorProps {
  readonly workspaceId: string;
  /** Told whether a link is on screen that has not been copied yet. */
  readonly onUncopiedChange?: ((hasUncopiedLink: boolean) => void) | undefined;
}

const EXPIRY_CHOICES = [1, 7, 30] as const;
const MAX_USES_LIMIT = 200;
const ROLE_OPTIONS = [
  { value: 'VIEWER' as const, label: ROLE_SUMMARY.VIEWER },
  { value: 'EDITOR' as const, label: ROLE_SUMMARY.EDITOR },
];

/** Keeps a typed use count inside the range the Core API accepts. */
function clampMaxUses(raw: number): number {
  if (!Number.isFinite(raw)) return 1;
  return Math.max(1, Math.min(MAX_USES_LIMIT, Math.trunc(raw)));
}

/** Renders the role picker, the folded options and the create button. */
export function InviteLinkCreator({ workspaceId, onUncopiedChange }: InviteLinkCreatorProps) {
  const create = useCreateInvite(workspaceId);
  const [role, setRole] = useState<WorkspaceRole>('VIEWER');
  const [expiresInDays, setExpiresInDays] = useState<number>(7);
  const [maxUses, setMaxUses] = useState<number>(1);
  const [freshLink, setFreshLink] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    onUncopiedChange?.(freshLink !== null && !copied);
  }, [freshLink, copied, onUncopiedChange]);

  const handleCreate = () => {
    create.mutate(
      { role, expiresInDays, maxUses },
      {
        onSuccess: (invite) => {
          setCopied(false);
          setFreshLink(invite.token ? inviteUrlFor(invite.token) : null);
        },
      },
    );
  };

  return (
    <div className="invite-link">
      <p className="invite-link__intro">
        Dùng được cho cả người chưa có tài khoản UniChat. Gửi link qua Zalo, email hay nhóm lớp
        — người nhận bấm vào là tham gia.
      </p>
      <label className="invite-link__field">
        <span>Vai trò khi tham gia</span>
        <SelectMenu variant="field" label="Vai trò khi tham gia" value={role}
          options={ROLE_OPTIONS} onChange={setRole} />
      </label>
      <details className="invite-link__advanced">
        <summary>Tùy chọn nâng cao</summary>
        <div className="invite-link__advanced-body">
          <label className="invite-link__field">
            <span>Hết hạn sau</span>
            <SelectMenu variant="field" label="Hết hạn sau" value={expiresInDays}
              options={EXPIRY_CHOICES.map((days) => ({ value: days, label: `${days} ngày` }))}
              onChange={setExpiresInDays} />
          </label>
          <label className="invite-link__field">
            <span>Số lượt dùng</span>
            <input type="number" min={1} max={MAX_USES_LIMIT} value={maxUses}
              onChange={(e) => setMaxUses(clampMaxUses(Number(e.target.value)))} />
          </label>
        </div>
      </details>
      {create.error && (
        <p className="invite-link__error" role="alert">
          {create.error.message || 'Không tạo được link mời'}
        </p>
      )}
      <button type="button" className="invite-link__create" onClick={handleCreate}
        disabled={create.isPending}>
        <Icon name="link" size={16} />
        {create.isPending ? 'Đang tạo…' : freshLink ? 'Tạo link khác' : 'Tạo link mời'}
      </button>
      {freshLink && <FreshLink link={freshLink} copied={copied} onCopied={setCopied} />}
    </div>
  );
}

interface FreshLinkProps {
  readonly link: string;
  readonly copied: boolean;
  readonly onCopied: (copied: boolean) => void;
}

/** What to tell the owner about the link they have just been given. */
function freshNote(copied: boolean, attempted: boolean): string {
  if (copied) return 'Đã sao chép link. Link chỉ hiện một lần — hãy gửi đi ngay.';
  if (attempted) return 'Chưa sao chép được tự động. Hãy bấm Sao chép hoặc bôi đen để chép tay.';
  return 'Link chỉ hiện một lần duy nhất và không xem lại được.';
}

/** The new link, copied on arrival, with a manual copy button as backup. */
function FreshLink({ link, copied, onCopied }: FreshLinkProps) {
  const fieldRef = useRef<HTMLInputElement>(null);
  const [attempted, setAttempted] = useState(false);

  useEffect(() => {
    let live = true;
    setAttempted(false);
    void copyText(link, fieldRef.current).then((ok) => {
      if (!live) return;
      onCopied(ok);
      setAttempted(true);
    });
    return () => {
      live = false;
    };
  }, [link, onCopied]);

  const handleCopy = async () => {
    onCopied(await copyText(link, fieldRef.current));
    setAttempted(true);
  };

  return (
    <div className={`invite-link__fresh${copied ? ' invite-link__fresh--copied' : ''}`}>
      <p className="invite-link__fresh-note" role="status">
        <Icon name={copied ? 'check_circle' : 'warning'} size={16} />
        {freshNote(copied, attempted)}
      </p>
      <div className="invite-link__fresh-row">
        <input ref={fieldRef} readOnly value={link} aria-label="Link mời"
          onFocus={(e) => e.target.select()} />
        <button type="button" onClick={handleCopy}>{copied ? 'Đã chép' : 'Sao chép'}</button>
      </div>
    </div>
  );
}
