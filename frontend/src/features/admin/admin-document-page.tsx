import { useState, useEffect, useCallback } from 'react';
import { Icon } from '../../components/icon';
import {
  fetchAdminDocuments,
  retryAdminDocument,
  type AdminDocumentItem,
} from './admin-api';

export function AdminDocumentPage() {
  const [documents, setDocuments] = useState<AdminDocumentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [retryingId, setRetryingId] = useState<string | null>(null);

  const loadData = useCallback(() => {
    setLoading(true);
    fetchAdminDocuments(0, 50)
      .then((res) => setDocuments(res.content || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    let isMounted = true;
    fetchAdminDocuments(0, 50)
      .then((res) => {
        if (isMounted) setDocuments(res.content || []);
      })
      .catch(() => {})
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const handleRetry = async (doc: AdminDocumentItem) => {
    setRetryingId(doc.id);
    try {
      const res = await retryAdminDocument(doc.id);
      alert(res.message || 'Đã gửi lại yêu cầu nạp tài liệu vào hàng đợi RabbitMQ.');
      loadData();
    } catch {
      alert('Không thể thử lại nạp tài liệu');
    } finally {
      setRetryingId(null);
    }
  };

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '20px 24px', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
        <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#0f172a', margin: '0 0 6px 0' }}>
          Quản trị Tài liệu & Tiến trình Ingestion RAG
        </h2>
        <p style={{ margin: 0, fontSize: '0.875rem', color: '#64748b' }}>
          Theo dõi trạng thái bóc tách, nhúng vector vào ChromaDB và thử lại các file bị lỗi mà không cần người dùng tải lại.
        </p>
      </div>

      <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.875rem' }}>
          <thead>
            <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#64748b' }}>
              <th style={{ padding: '12px 16px' }}>Tên tài liệu</th>
              <th style={{ padding: '12px 16px' }}>Định dạng</th>
              <th style={{ padding: '12px 16px' }}>Kích thước</th>
              <th style={{ padding: '12px 16px' }}>Trạng thái Ingestion</th>
              <th style={{ padding: '12px 16px' }}>Ngày nạp</th>
              <th style={{ padding: '12px 16px' }}>Thao tác</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={6} style={{ padding: '24px', textAlign: 'center', color: '#64748b' }}>Đang tải danh sách tài liệu...</td></tr>
            ) : documents.length === 0 ? (
              <tr><td colSpan={6} style={{ padding: '24px', textAlign: 'center', color: '#64748b' }}>Chưa có tài liệu nào trong hệ thống</td></tr>
            ) : (
              documents.map((d) => (
                <tr key={d.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                  <td style={{ padding: '14px 16px', fontWeight: 600, color: '#0f172a' }}>{d.originalName}</td>
                  <td style={{ padding: '14px 16px', color: '#64748b' }}>{d.mediaType}</td>
                  <td style={{ padding: '14px 16px' }}>{formatSize(d.byteSize)}</td>
                  <td style={{ padding: '14px 16px' }}>
                    <span style={{
                      padding: '3px 8px',
                      borderRadius: '9999px',
                      fontSize: '0.75rem',
                      fontWeight: 600,
                      background: d.status === 'PROCESSED' ? '#dcfce7' : d.status === 'FAILED' ? '#fee2e2' : '#fef3c7',
                      color: d.status === 'PROCESSED' ? '#15803d' : d.status === 'FAILED' ? '#b91c1c' : '#b45309',
                    }}>
                      {d.status === 'PROCESSED' ? '🟢 Đã nạp Vector' : d.status === 'FAILED' ? '🔴 Lỗi Ingestion' : '🟡 Đang xử lý'}
                    </span>
                  </td>
                  <td style={{ padding: '14px 16px', color: '#64748b' }}>{new Date(d.createdAt).toLocaleDateString('vi-VN')}</td>
                  <td style={{ padding: '14px 16px' }}>
                    <button
                      type="button"
                      style={{
                        padding: '6px 12px',
                        borderRadius: '6px',
                        fontSize: '0.75rem',
                        fontWeight: 600,
                        cursor: 'pointer',
                        background: '#eff6ff',
                        color: '#2563eb',
                        border: '1px solid #bfdbfe',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 4,
                      }}
                      onClick={() => handleRetry(d)}
                      disabled={retryingId === d.id}
                    >
                      <Icon name="replay" size={14} />
                      <span>{retryingId === d.id ? 'Đang gửi lại...' : 'Thử lại (Retry)'}</span>
                    </button>
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

export default AdminDocumentPage;
