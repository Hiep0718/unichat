/**
 * The group's Thành viên tab: the member list, and the ways to change it.
 *
 * Holds the data and the decisions; {@link MemberList} draws them. Errors are
 * reported in the card rather than through `alert()`, which the previous
 * implementation used: a modal dialog interrupts to say something the row it
 * concerns could have said in place.
 */
import { useCallback, useState } from 'react';
import { Link } from 'react-router-dom';

import { Icon } from '../../../components/icon';
import { useAuth } from '../../auth/auth-context';
import { allowsMembers } from '../../workspaces/workspace-visibility';
import { InviteForm } from '../invite-form';
import {
  useInviteMember,
  useMembers,
  useRemoveMember,
  useUpdateMemberRole,
} from '../member-hooks';
import { MemberList } from './member-list';

import type { InviteMemberInput, MemberRole } from '../member-schema';
import type { WorkspaceVisibility } from '../../workspaces/workspace-schema';

interface MemberPanelProps {
  readonly workspaceId: string;
  readonly isOwner: boolean;
  /**
   * Decides whether this workspace may hold members at all. Optional so the
   * panel still renders where the level is not to hand; the Core API refuses
   * the request either way, and this only spares the owner the round trip.
   */
  readonly visibility?: WorkspaceVisibility | undefined;
}

/** The message to show for a failed call, without leaking the raw error. */
function messageOf(error: unknown, fallback: string): string {
  return error instanceof Error && error.message ? error.message : fallback;
}

export function MemberPanel({ workspaceId, isOwner, visibility }: MemberPanelProps) {
  const { user } = useAuth();
  const { data, isPending, error: loadError } = useMembers(workspaceId);
  const invite = useInviteMember(workspaceId);
  const updateRole = useUpdateMemberRole(workspaceId);
  const remove = useRemoveMember(workspaceId);

  const [isInviteOpen, setInviteOpen] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  // A PRIVATE workspace holds nobody but its owner, so the invite button is
  // replaced with the way out rather than left to fail on submit.
  const canInvite = visibility === undefined || allowsMembers(visibility);

  const handleInvite = useCallback(
    (input: InviteMemberInput) => {
      invite.mutate(input, { onSuccess: () => setInviteOpen(false) });
    },
    [invite],
  );

  const handleRoleChange = useCallback(
    (userId: string, role: MemberRole) => {
      setActionError(null);
      updateRole.mutate(
        { userId, role },
        { onError: (err) => setActionError(messageOf(err, 'Không đổi được vai trò')) },
      );
    },
    [updateRole],
  );

  const handleRemove = useCallback(
    (userId: string) => {
      // Removing someone cannot be undone from here, and the row carries no
      // other signal that the icon is destructive.
      if (!window.confirm('Gỡ thành viên này khỏi nhóm?')) return;
      setActionError(null);
      remove.mutate(userId, {
        onError: (err) => setActionError(messageOf(err, 'Không gỡ được thành viên')),
      });
    },
    [remove],
  );

  return (
    <>
      {loadError && (
        <p className="member-section__error" role="alert">
          <Icon name="error_outline" size={16} />
          {messageOf(loadError, 'Không tải được danh sách thành viên')}
        </p>
      )}

      {actionError && (
        <p className="member-section__error" role="alert">
          <Icon name="error_outline" size={16} />
          {actionError}
        </p>
      )}

      {isOwner && !canInvite && (
        <p className="member-section__private-notice">
          Workspace đang ở chế độ <strong>Riêng tư</strong> nên chỉ mình bạn truy cập được.
          Hãy{' '}
          <Link to={`/workspaces/${workspaceId}/settings?tab=access`}>
            chuyển sang chế độ Chia sẻ
          </Link>{' '}
          để mời thành viên.
        </p>
      )}

      <MemberList
        members={data ?? []}
        isLoading={isPending}
        currentUserId={user?.id ?? ''}
        canManage={isOwner}
        canInvite={isOwner && canInvite}
        onRoleChange={handleRoleChange}
        onRemove={handleRemove}
        onInviteClick={() => setInviteOpen(true)}
      />

      <InviteForm
        isOpen={isInviteOpen}
        isPending={invite.isPending}
        serverError={invite.error ? messageOf(invite.error, 'Không mời được thành viên') : null}
        onSubmit={handleInvite}
        onClose={() => setInviteOpen(false)}
      />
    </>
  );
}
