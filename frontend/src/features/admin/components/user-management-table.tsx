import React, { useState, useEffect, useCallback } from 'react';
import { UserItem, fetchAdminUsers, updateAdminUserStatus } from '../admin-api';
import './user-management-table.css';

export const UserManagementTable: React.FC = () => {
  const [users, setUsers] = useState<UserItem[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadUsers = useCallback((query?: string) => {
    fetchAdminUsers(query)
      .then((res) => {
        setUsers(res.content || []);
        setError(null);
      })
      .catch((err: unknown) => {
        setError(err instanceof Error ? err.message : 'Không thể tải danh sách người dùng');
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    let isMounted = true;
    fetchAdminUsers()
      .then((res) => {
        if (isMounted) {
          setUsers(res.content || []);
          setError(null);
          setLoading(false);
        }
      })
      .catch((err: unknown) => {
        if (isMounted) {
          setError(err instanceof Error ? err.message : 'Không thể tải danh sách người dùng');
          setLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setSearch(val);
    loadUsers(val);
  };

  const handleToggleLock = async (user: UserItem) => {
    const nextStatus = user.status === 'LOCKED' ? 'ACTIVE' : 'LOCKED';
    const actionText = nextStatus === 'LOCKED' ? 'khóa' : 'mở khóa';
    if (!confirm(`Bạn có chắc muốn ${actionText} tài khoản ${user.email}?`)) return;

    try {
      await updateAdminUserStatus(user.id, nextStatus);
      loadUsers(search);
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : `Không thể ${actionText} tài khoản`);
    }
  };

  return (
    <div className="admin-management">
      <div className="admin-management__header">
        <h2 className="admin-management__title">Quản lý Người dùng System</h2>
        <input
          type="text"
          className="admin-search-input"
          placeholder="Tìm kiếm theo email..."
          value={search}
          onChange={handleSearchChange}
        />
      </div>

      {error && <div style={{ color: '#ef4444' }}>{error}</div>}

      {loading ? (
        <div>Đang tải dữ liệu...</div>
      ) : (
        <div className="admin-table-container">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Email</th>
                <th>Vai trò Hệ thống</th>
                <th>Trạng thái</th>
                <th>Ngày khởi tạo</th>
                <th>Hành động</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id}>
                  <td>{u.email}</td>
                  <td>{u.systemRole}</td>
                  <td>
                    <span className={`admin-badge admin-badge--${u.status.toLowerCase()}`}>
                      {u.status}
                    </span>
                  </td>
                  <td>{new Date(u.createdAt).toLocaleDateString('vi-VN')}</td>
                  <td>
                    {u.systemRole !== 'ADMIN' && (
                      <button
                        className={`admin-status-btn admin-status-btn--${u.status === 'LOCKED' ? 'unlock' : 'lock'}`}
                        onClick={() => handleToggleLock(u)}
                      >
                        {u.status === 'LOCKED' ? 'Mở khóa' : 'Khóa tài khoản'}
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
