import type { UserItem, SystemRole, UserStatus } from '../admin-api';
interface Props {
  user: UserItem; ownId: string | undefined; busy: boolean;
  mutate: (user: UserItem, change: { role: SystemRole } | { status: UserStatus }) => Promise<void>;
}
/** Displays current account status and prevents self-lock/demotion in the UI. */
export function AdminUserRow({ user, ownId, busy, mutate }: Props) {
  const own = user.id === ownId;
  return <tr><td><div className="admin-user-info"><span className="admin-user-name">{user.displayName || user.email}</span><span className="admin-user-email">{user.email}</span></div></td>
    <td><span className={`admin-badge ${user.systemRole === 'ADMIN' ? 'admin-badge--role-admin' : 'admin-badge--role-user'}`}>{user.systemRole}</span></td>
    <td><span className={`admin-badge ${user.status === 'LOCKED' ? 'admin-badge--locked' : 'admin-badge--active'}`}>
      {user.status === 'LOCKED' ? 'Đã khóa' : user.status === 'ACTIVE' ? 'Hoạt động' : 'Chờ xác minh'}</span></td>
    <td>{new Date(user.createdAt).toLocaleDateString('vi-VN')}</td><td>
      <div className="admin-actions-cell"><button className={`admin-action-btn ${user.status === 'LOCKED' ? 'admin-action-btn--unlock' : 'admin-action-btn--lock'}`} type="button" disabled={busy || own} onClick={() => void mutate(user, { status: user.status === 'LOCKED' ? 'ACTIVE' : 'LOCKED' })}>
        {user.status === 'LOCKED' ? 'Mở khóa' : 'Khóa'}</button>
      <button className={`admin-action-btn ${user.systemRole === 'ADMIN' ? 'admin-action-btn--demote' : 'admin-action-btn--promote'}`} type="button" disabled={busy || (own && user.systemRole === 'ADMIN')} onClick={() => void mutate(user, { role: user.systemRole === 'ADMIN' ? 'USER' : 'ADMIN' })}>
        {user.systemRole === 'ADMIN' ? 'Hạ cấp USER' : 'Cấp quyền ADMIN'}</button></div>
    </td></tr>;
}
