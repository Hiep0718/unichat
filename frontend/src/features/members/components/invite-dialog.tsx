/**
 * The "Mời thành viên" dialog: the two ways into a workspace, side by side.
 *
 * "Qua email" admits someone who already has an account; "Qua link" issues an
 * invite link for anyone else. Both tabs stay mounted while the dialog is open,
 * because a fresh link exists only on screen — switching tabs must not lose it.
 */
import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

import { Icon } from '../../../components/icon';
import { InviteLinkCreator } from '../../workspaces/components/invite-link-creator';
import { EmailInviteForm } from './email-invite-form';

import type { MouseEvent } from 'react';
import type { InviteMemberInput } from '../member-schema';

import './invite-dialog.css';

type InviteTab = 'email' | 'link';

const TABS: readonly { value: InviteTab; label: string; icon: string }[] = [
  { value: 'email', label: 'Qua email', icon: 'mail' },
  { value: 'link', label: 'Qua link', icon: 'link' },
];

const UNCOPIED_WARNING = 'Link mời chưa được sao chép và sẽ không xem lại được. Vẫn đóng?';

interface InviteDialogProps {
  readonly isOpen: boolean;
  readonly workspaceId: string;
  readonly isPending: boolean;
  readonly serverError: string | null;
  readonly onSubmit: (data: InviteMemberInput) => void;
  readonly onClose: () => void;
}

/** Renders the dialog only while open, so each opening starts clean. */
export function InviteDialog(props: InviteDialogProps) {
  if (!props.isOpen) return null;
  return <OpenInviteDialog {...props} />;
}

/** The open dialog: header, tab strip and both tab panels. */
function OpenInviteDialog({ workspaceId, isPending, serverError, onSubmit, onClose }: InviteDialogProps) {
  const [tab, setTab] = useState<InviteTab>('email');
  const [hasUncopiedLink, setHasUncopiedLink] = useState(false);

  /** Closes unless a link would be lost and the owner says to keep it. */
  const requestClose = useCallback((): boolean => {
    if (hasUncopiedLink && !window.confirm(UNCOPIED_WARNING)) return false;
    onClose();
    return true;
  }, [hasUncopiedLink, onClose]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !e.defaultPrevented) requestClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [requestClose]);

  const handleManageClick = (e: MouseEvent) => {
    if (!requestClose()) e.preventDefault();
  };

  return (
    <div className="invite-overlay" onClick={requestClose} role="presentation">
      <div className="invite-modal" onClick={(e) => e.stopPropagation()}
        role="dialog" aria-modal="true" aria-label="Mời thành viên">
        <div className="invite-modal__header">
          <h3 className="invite-modal__title">Mời thành viên</h3>
          <button className="invite-modal__close" type="button" onClick={requestClose} aria-label="Đóng">
            <Icon name="close" size={20} />
          </button>
        </div>
        <div className="invite-modal__tabs" role="tablist" aria-label="Cách mời">
          {TABS.map((item) => (
            <button key={item.value} type="button" role="tab" id={`invite-tab-${item.value}`}
              aria-controls={`invite-panel-${item.value}`} aria-selected={tab === item.value}
              className="invite-modal__tab" onClick={() => setTab(item.value)}>
              <Icon name={item.icon} size={16} />
              {item.label}
            </button>
          ))}
        </div>
        <div role="tabpanel" id="invite-panel-email" aria-labelledby="invite-tab-email" hidden={tab !== 'email'}>
          <EmailInviteForm isPending={isPending} serverError={serverError}
            onSubmit={onSubmit} onCancel={requestClose} />
        </div>
        <div role="tabpanel" id="invite-panel-link" aria-labelledby="invite-tab-link" hidden={tab !== 'link'}>
          <InviteLinkCreator workspaceId={workspaceId} onUncopiedChange={setHasUncopiedLink} />
          <Link className="invite-modal__manage" to={`/workspaces/${workspaceId}/settings?tab=access`}
            onClick={handleManageClick}>
            Quản lý link đã tạo →
          </Link>
        </div>
      </div>
    </div>
  );
}
