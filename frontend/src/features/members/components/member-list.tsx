/**
 * Who is in a group, one row each.
 *
 * A list rather than a table: there are three facts per member — who they are,
 * what they may do, and the way to remove them — and column headings over
 * three columns cost a row of chrome to label what each row already says.
 */
import { useCallback } from 'react';

import { EntityAvatar } from '../../../components/entity-avatar';
import { Icon } from '../../../components/icon';
import { ROLE_LABELS } from '../member-schema';

import type { AvatarColorKey } from '../../../components/entity-avatar';
import type { MemberDto, MemberRole } from '../member-schema';
import './member-list.css';

interface MemberListProps {
  readonly members: readonly MemberDto[];
  readonly isLoading: boolean;
  /** Marks the viewer's own row; empty while the session is still loading. */
  readonly currentUserId: string;
  /** Only an owner may change roles or remove anyone. */
  readonly canManage: boolean;
  /** Hidden where the workspace holds nobody but its owner. */
  readonly canInvite: boolean;
  readonly onRoleChange: (userId: string, role: MemberRole) => void;
  readonly onRemove: (userId: string) => void;
  readonly onInviteClick: () => void;
}

/** The server only sends colours it accepts, but the type is a plain string. */
function toColourKey(value: string | null): AvatarColorKey | null {
  const keys = ['navy', 'teal', 'plum', 'moss', 'clay', 'slate'];
  return value && keys.includes(value) ? (value as AvatarColorKey) : null;
}

export function MemberList({
  members,
  isLoading,
  currentUserId,
  canManage,
  canInvite,
  onRoleChange,
  onRemove,
  onInviteClick,
}: MemberListProps) {
  return (
    <section className="member-section">
      <header className="member-section__header">
        <h2 className="member-section__title">
          Thành viên
          <span className="member-section__count">({members.length})</span>
        </h2>
        {canInvite && (
          <button className="member-section__invite-btn" type="button" onClick={onInviteClick}>
            <Icon name="person_add" size={18} />
            Mời thành viên
          </button>
        )}
      </header>

      {isLoading && <MemberListSkeleton />}

      {!isLoading && members.length === 0 && (
        <div className="member-list__empty">
          <Icon name="group" size={40} />
          <p>Chưa có thành viên nào ngoài bạn.</p>
        </div>
      )}

      {!isLoading && members.length > 0 && (
        <ul className="member-list">
          {members.map((member) => (
            <MemberRow
              key={member.userId}
              member={member}
              isSelf={member.userId === currentUserId}
              canManage={canManage}
              onRoleChange={onRoleChange}
              onRemove={onRemove}
            />
          ))}
        </ul>
      )}
    </section>
  );
}

interface MemberRowProps {
  readonly member: MemberDto;
  readonly isSelf: boolean;
  readonly canManage: boolean;
  readonly onRoleChange: (userId: string, role: MemberRole) => void;
  readonly onRemove: (userId: string) => void;
}

/** One member: who they are, what they may do, and the way to remove them. */
function MemberRow({ member, isSelf, canManage, onRoleChange, onRemove }: MemberRowProps) {
  const isOwner = member.role === 'OWNER';
  const name = member.displayName?.trim() || member.email;

  const handleRoleChange = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      onRoleChange(member.userId, e.target.value as MemberRole);
    },
    [member.userId, onRoleChange],
  );

  return (
    <li className="member-list__row">
      <EntityAvatar
        name={name}
        size={40}
        shape="circle"
        userId={member.userId}
        hasAvatar={member.hasAvatar}
        avatarColor={toColourKey(member.avatarColor)}
      />

      <div className="member-list__identity">
        <span className="member-list__email" title={member.email}>
          {member.email}
        </span>
        {isSelf && <span className="member-list__self">Bạn</span>}
      </div>

      {/* An owner's role is not editable — a group without one is a group
          nobody can administer. */}
      {canManage && !isOwner ? (
        <select
          className="member-list__role-select"
          value={member.role}
          onChange={handleRoleChange}
          aria-label={`Vai trò của ${member.email}`}
        >
          <option value="EDITOR">{ROLE_LABELS.EDITOR}</option>
          <option value="VIEWER">{ROLE_LABELS.VIEWER}</option>
        </select>
      ) : (
        <span className={`member-list__role member-list__role--${member.role.toLowerCase()}`}>
          {ROLE_LABELS[member.role]}
        </span>
      )}

      <span className="member-list__action">
        {canManage && !isOwner && (
          <button
            className="member-list__remove"
            type="button"
            title="Gỡ khỏi nhóm"
            aria-label={`Gỡ ${member.email} khỏi nhóm`}
            onClick={() => onRemove(member.userId)}
          >
            <Icon name="person_remove" size={18} />
          </button>
        )}
      </span>
    </li>
  );
}

/** Three grey rows while the list loads, so the card does not jump into place. */
function MemberListSkeleton() {
  return (
    <div className="member-list__skeleton" aria-hidden="true">
      {Array.from({ length: 3 }, (_, i) => (
        <div key={i} className="member-list__skeleton-row">
          <div className="member-list__skeleton-avatar" />
          <div className="member-list__skeleton-line" />
          <div className="member-list__skeleton-pill" />
        </div>
      ))}
    </div>
  );
}
