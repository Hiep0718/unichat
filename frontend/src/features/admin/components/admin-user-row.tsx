import type { UserItem, SystemRole, UserStatus } from '../admin-api';
interface Props {
  user: UserItem; ownId: string | undefined; busy: boolean;
  mutate: (user: UserItem, change: { role: SystemRole } | { status: UserStatus }) => Promise<void>;
}
/** Displays current account status and prevents self-lock/demotion in the UI. */
export function AdminUserRow({ user, ownId, busy, mutate }: Props) {
  const own = user.id === ownId;
  return <tr><td>{user.displayName || user.email}<br />{user.email}</td><td>{user.systemRole}</td>
    <td>{user.status === 'LOCKED' ? 'Đã khóa' : user.status === 'ACTIVE' ? 'Hoạt động' : 'Chờ xác minh'}</td>
    <td>{new Date(user.createdAt).toLocaleDateString('vi-VN')}</td><td>
      <button type="button" disabled={busy || own} onClick={() => void mutate(user, { status: user.status === 'LOCKED' ? 'ACTIVE' : 'LOCKED' })}>
        {user.status === 'LOCKED' ? 'Mở khóa' : 'Khóa'}</button>
      <button type="button" disabled={busy || (own && user.systemRole === 'ADMIN')} onClick={() => void mutate(user, { role: user.systemRole === 'ADMIN' ? 'USER' : 'ADMIN' })}>
        {user.systemRole === 'ADMIN' ? 'Hạ cấp USER' : 'Cấp quyền ADMIN'}</button>
    </td></tr>;
}
