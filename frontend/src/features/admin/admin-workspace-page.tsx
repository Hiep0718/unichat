import { useState, useEffect, useCallback } from 'react';
import { Icon } from '../../components/icon';
import {
  fetchAdminWorkspaces,
  toggleWorkspaceVisibility,
  deleteAdminWorkspace,
  type AdminWorkspaceItem,
} from './admin-api';

export function AdminWorkspacePage() {
  const [workspaces, setWorkspaces] = useState<AdminWorkspaceItem[]>([]);
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(() => {
    setLoading(true);
    fetchAdminWorkspaces(0, 50)
      .then((res) => setWorkspaces(res.content || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    let isMounted = true;
    fetchAdminWorkspaces(0, 50)
      .then((res) => {
        if (isMounted) setWorkspaces(res.content || []);
      })
      .catch(() => {})
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const handleToggleVisibility = async (w: AdminWorkspaceItem) => {
    const nextVis = w.visibility === 'PUBLIC' ? 'PRIVATE' : 'PUBLIC';
    if (!window.confirm(`Đổi chế độ không gian làm việc "${w.name}" sang ${nextVis}?`)) return;

    try {
      await toggleWorkspaceVisibility(w.id, nextVis);
      loadData();
    } catch {
      alert('Không thể đổi chế độ hiển thị');
    }
  };

  const handleDelete = async (w: AdminWorkspaceItem) => {
    if (!window.confirm(`XÁC NHẬN: Bạn có chắc chắn muốn xóa nhóm "${w.name}"? Dữ liệu tài liệu và vector sẽ được giải phóng.`)) return;

    try {
      await deleteAdminWorkspace(w.id);
      loadData();
    } catch {
      alert('Không thể xóa không gian làm việc');
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '20px 24px', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
        <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#0f172a', margin: '0 0 6px 0' }}>
          Quản trị Không gian làm việc (Workspaces & Groups)
        </h2>
        <p style={{ margin: 0, fontSize: '0.875rem', color: '#64748b' }}>
          Theo dõi tất cả nhóm học tập công khai và riêng tư, kiểm duyệt quyền riêng tư hoặc gỡ bỏ nhóm vi phạm nội quy.
        </p>
      </div>

      <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.875rem' }}>
          <thead>
            <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#64748b' }}>
              <th style={{ padding: '12px 16px' }}>Tên nhóm</th>
              <th style={{ padding: '12px 16px' }}>Chế độ</th>
              <th style={{ padding: '12px 16px' }}>Số tài liệu</th>
              <th style={{ padding: '12px 16px' }}>Ngày tạo</th>
              <th style={{ padding: '12px 16px' }}>Thao tác</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={5} style={{ padding: '24px', textAlign: 'center', color: '#64748b' }}>Đang tải danh sách...</td></tr>
            ) : workspaces.length === 0 ? (
              <tr><td colSpan={5} style={{ padding: '24px', textAlign: 'center', color: '#64748b' }}>Chưa có không gian làm việc nào</td></tr>
            ) : (
              workspaces.map((w) => (
                <tr key={w.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                  <td style={{ padding: '14px 16px', fontWeight: 600, color: '#0f172a' }}>{w.name}</td>
                  <td style={{ padding: '14px 16px' }}>
                    <span style={{
                      padding: '3px 8px',
                      borderRadius: '9999px',
                      fontSize: '0.75rem',
                      fontWeight: 600,
                      background: w.visibility === 'PUBLIC' ? '#dcfce7' : '#f1f5f9',
                      color: w.visibility === 'PUBLIC' ? '#15803d' : '#475569',
                    }}>
                      {w.visibility === 'PUBLIC' ? '🌐 Công khai' : '🔒 Riêng tư'}
                    </span>
                  </td>
                  <td style={{ padding: '14px 16px' }}>{w.documentCount} tài liệu</td>
                  <td style={{ padding: '14px 16px', color: '#64748b' }}>{new Date(w.createdAt).toLocaleDateString('vi-VN')}</td>
                  <td style={{ padding: '14px 16px' }}>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button
                        type="button"
                        style={{
                          padding: '6px 10px',
                          borderRadius: '6px',
                          fontSize: '0.75rem',
                          fontWeight: 600,
                          cursor: 'pointer',
                          background: '#f8fafc',
                          border: '1px solid #cbd5e1',
                          color: '#334155',
                        }}
                        onClick={() => handleToggleVisibility(w)}
                      >
                        Đổi sang {w.visibility === 'PUBLIC' ? 'Riêng tư' : 'Công khai'}
                      </button>
                      <button
                        type="button"
                        style={{
                          padding: '6px 10px',
                          borderRadius: '6px',
                          fontSize: '0.75rem',
                          fontWeight: 600,
                          cursor: 'pointer',
                          background: '#fff1f2',
                          border: '1px solid #fecdd3',
                          color: '#e11d48',
                        }}
                        onClick={() => handleDelete(w)}
                      >
                        <Icon name="delete" size={14} style={{ verticalAlign: 'middle', marginRight: 4 }} />
                        Xóa
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default AdminWorkspacePage;
