/**
 * Member table with role management and remove actions.
 * Displays workspace members in a high-density table.
 */

import { useCallback } from 'react';

import { Icon } from '../../components/icon';

import type { MemberDto, MemberRole } from './member-schema';
import { ROLE_LABELS } from './member-schema';

import './member-table.css';

interface MemberTableProps {
  readonly members: readonly MemberDto[];
  readonly isLoading: boolean;
  readonly onRoleChange: (userId: string, role: MemberRole) => void;
  readonly onRemove: (userId: string) => void;
  readonly onInviteClick: () => void;
}

/**
 * Renders the member data table with invite button, role badges, and actions.
 */
export function MemberTable({
  members,
  isLoading,
  onRoleChange,
  onRemove,
  onInviteClick,
}: MemberTableProps) {
  return (
    <div className="member-section">
      <div className="member-section__header">
        <h3 className="member-section__title">
          Thành viên
          <span className="member-section__count">({members.length})</span>
        </h3>
        <button
          className="member-section__invite-btn"
          type="button"
          onClick={onInviteClick}
        >
          <Icon name="person_add" size={18} />
          Mời thành viên
        </button>
      </div>

      {isLoading && <TableSkeleton />}

      {!isLoading && members.length === 0 && (
        <div className="member-table__empty">
          <Icon name="group" size={48} />
          <p>Chưa có thành viên nào ngoài bạn.</p>
        </div>
      )}

      {!isLoading && members.length > 0 && (
        <div className="member-table__wrapper">
          <table className="member-table">
            <thead>
              <tr>
                <th className="member-table__th">Email</th>
                <th className="member-table__th">Vai trò</th>
                <th className="member-table__th member-table__th--actions">Hành động</th>
              </tr>
            </thead>
            <tbody>
              {members.map((member) => (
                <MemberRow
                  key={member.userId}
                  member={member}
                  onRoleChange={onRoleChange}
                  onRemove={onRemove}
                />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

/* ─── Sub-components ─────────────────────────────────────── */

function MemberRow({
  member,
  onRoleChange,
  onRemove,
}: {
  readonly member: MemberDto;
  readonly onRoleChange: (userId: string, role: MemberRole) => void;
  readonly onRemove: (userId: string) => void;
}) {
  const isOwner = member.role === 'OWNER';
  const initial = member.email.charAt(0).toUpperCase();

  const handleRoleChange = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      onRoleChange(member.userId, e.target.value as MemberRole);
    },
    [member.userId, onRoleChange],
  );

  return (
    <tr className="member-table__row">
      <td className="member-table__td">
        <div className="member-table__td--email">
          <span className="member-table__avatar">{initial}</span>
          <span className="member-table__email-text" title={member.email}>
            {member.email}
          </span>
        </div>
      </td>
      <td className="member-table__td">
        {isOwner ? (
          <RoleBadge role={member.role} />
        ) : (
          <RoleSelect role={member.role} onChange={handleRoleChange} />
        )}
      </td>
      <td className="member-table__td member-table__td--actions">
        {!isOwner && (
          <button
            className="member-table__action-btn member-table__action-btn--danger"
            type="button"
            title="Xóa thành viên"
            aria-label={`Xóa ${member.email}`}
            onClick={() => onRemove(member.userId)}
          >
            <Icon name="person_remove" size={18} />
          </button>
        )}
      </td>
    </tr>
  );
}

function RoleBadge({ role }: { readonly role: MemberRole }) {
  const className = `member-table__role member-table__role--${role.toLowerCase()}`;
  return <span className={className}>{ROLE_LABELS[role]}</span>;
}

function RoleSelect({
  role,
  onChange,
}: {
  readonly role: MemberRole;
  readonly onChange: (e: React.ChangeEvent<HTMLSelectElement>) => void;
}) {
  return (
    <select
      className="member-table__role-select"
      value={role}
      onChange={onChange}
      aria-label="Thay đổi vai trò"
    >
      <option value="EDITOR">{ROLE_LABELS.EDITOR}</option>
      <option value="VIEWER">{ROLE_LABELS.VIEWER}</option>
    </select>
  );
}

function TableSkeleton() {
  return (
    <div className="member-table__skeleton">
      {Array.from({ length: 3 }, (_, i) => (
        <div key={i} className="member-table__skeleton-row">
          <div className="member-table__skeleton-cell member-table__skeleton-cell--avatar" />
          <div className="member-table__skeleton-cell member-table__skeleton-cell--wide" />
          <div className="member-table__skeleton-cell member-table__skeleton-cell--medium" />
        </div>
      ))}
    </div>
  );
}
