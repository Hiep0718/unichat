import { UserManagementTable } from './components/user-management-table';

export function AdminUserPage() {
  return (
    <div style={{ padding: '2rem', maxWidth: '1200px', margin: '0 auto' }}>
      <header style={{ marginBottom: '1.5rem' }}>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 700, color: '#0f172a', margin: '0 0 0.5rem 0' }}>
          Quản trị Người dùng Hệ thống
        </h1>
        <p style={{ fontSize: '0.875rem', color: '#64748b', margin: 0 }}>
          Tìm kiếm, kiểm tra trạng thái và điều khiển khóa / mở khóa tài khoản người dùng trong toàn hệ thống.
        </p>
      </header>

      <UserManagementTable />
    </div>
  );
}

export default AdminUserPage;
