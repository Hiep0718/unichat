import { Link } from 'react-router-dom';

import { useWorkspace } from './workspace-context';
import { Icon } from '../../components/icon';

export function WorkspaceOverviewPage() {
  const { workspace, role, isOwner, canEdit } = useWorkspace();

  if (!workspace) return null;

  return (
    <div style={{ padding: '2rem', maxWidth: '1200px', margin: '0 auto' }}>
      <header style={{ marginBottom: '2rem', paddingBottom: '1.5rem', borderBottom: '1px solid #e2e8f0' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <h1 style={{ fontSize: '1.75rem', fontWeight: 700, color: '#0f172a', margin: 0 }}>
              {workspace.name}
            </h1>
            <span
              style={{
                fontSize: '0.75rem',
                fontWeight: 600,
                padding: '0.25rem 0.625rem',
                borderRadius: '9999px',
                background: workspace.visibility === 'PUBLIC' ? '#e0f2fe' : workspace.visibility === 'SHARED' ? '#fef3c7' : '#f1f5f9',
                color: workspace.visibility === 'PUBLIC' ? '#0369a1' : workspace.visibility === 'SHARED' ? '#b45309' : '#475569',
              }}
            >
              {workspace.visibility === 'PUBLIC' ? 'Công khai' : workspace.visibility === 'SHARED' ? 'Chia sẻ' : 'Riêng tư'}
            </span>
            <span
              style={{
                fontSize: '0.75rem',
                fontWeight: 600,
                padding: '0.25rem 0.625rem',
                borderRadius: '0.375rem',
                background: '#f8fafc',
                border: '1px solid #cbd5e1',
                color: '#334155',
              }}
            >
              Vai trò: {role}
            </span>
          </div>

          {canEdit && (
            <Link
              to={`/workspaces/${workspace.id}/settings`}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.5rem',
                padding: '0.5rem 1rem',
                background: '#ffffff',
                border: '1px solid #cbd5e1',
                borderRadius: '0.375rem',
                color: '#334155',
                textDecoration: 'none',
                fontSize: '0.875rem',
                fontWeight: 500,
              }}
            >
              <Icon name="settings" size={18} />
              Cài đặt Workspace
            </Link>
          )}
        </div>

        {workspace.description && (
          <p style={{ fontSize: '0.9375rem', color: '#64748b', margin: 0 }}>{workspace.description}</p>
        )}
      </header>

      {/* Action Cards */}
      <section style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.5rem', marginBottom: '3rem' }}>
        <Link
          to={`/workspaces/${workspace.id}/chat`}
          style={{
            display: 'block',
            padding: '1.5rem',
            background: 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)',
            color: '#ffffff',
            borderRadius: '0.75rem',
            textDecoration: 'none',
            boxShadow: '0 10px 15px -3px rgba(2, 132, 199, 0.2)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.75rem' }}>
            <Icon name="chat" size={28} />
            <h3 style={{ fontSize: '1.25rem', fontWeight: 600, margin: 0 }}>Hỏi đáp Tri thức AI</h3>
          </div>
          <p style={{ fontSize: '0.875rem', opacity: 0.9, margin: 0 }}>
            Đặt câu hỏi trực tiếp và nhận câu trả lời có trích dẫn nguồn từ tài liệu trong Workspace.
          </p>
        </Link>

        <Link
          to={`/workspaces/${workspace.id}/documents`}
          style={{
            display: 'block',
            padding: '1.5rem',
            background: '#ffffff',
            border: '1px solid #e2e8f0',
            borderRadius: '0.75rem',
            textDecoration: 'none',
            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.75rem', color: '#0f172a' }}>
            <Icon name="description" size={28} style={{ color: '#0284c7' }} />
            <h3 style={{ fontSize: '1.25rem', fontWeight: 600, margin: 0 }}>Quản lý Tài liệu</h3>
          </div>
          <p style={{ fontSize: '0.875rem', color: '#64748b', margin: 0 }}>
            {canEdit ? 'Tải lên giáo trình PDF, DOCX, TXT để phục vụ RAG.' : 'Xem danh sách tài liệu đã bóc tách.'}
          </p>
        </Link>

        <Link
          to={`/workspaces/${workspace.id}/conversations`}
          style={{
            display: 'block',
            padding: '1.5rem',
            background: '#ffffff',
            border: '1px solid #e2e8f0',
            borderRadius: '0.75rem',
            textDecoration: 'none',
            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.75rem', color: '#0f172a' }}>
            <Icon name="history" size={28} style={{ color: '#0284c7' }} />
            <h3 style={{ fontSize: '1.25rem', fontWeight: 600, margin: 0 }}>Lịch sử Hỏi đáp</h3>
          </div>
          <p style={{ fontSize: '0.875rem', color: '#64748b', margin: 0 }}>
            Xem lại các phiên thảo luận và câu hỏi đã thực hiện trước đây.
          </p>
        </Link>
      </section>

      {/* Info Section */}
      <section style={{ background: '#f8fafc', borderRadius: '0.75rem', padding: '1.5rem', border: '1px solid #e2e8f0' }}>
        <h3 style={{ fontSize: '1rem', fontWeight: 600, color: '#0f172a', marginBottom: '0.75rem' }}>
          Thông tin phân quyền & bảo mật
        </h3>
        <ul style={{ margin: 0, paddingLeft: '1.25rem', fontSize: '0.875rem', color: '#475569', lineHeight: 1.6 }}>
          <li>Chỉ có tài liệu ở trạng thái <strong>PROCESSED</strong> mới được đưa vào không gian tri thức RAG.</li>
          <li>Quyền hạn được kiểm soát nghiêm ngặt bởi Core API trước khi gửi truy vấn đến AI Service.</li>
          {isOwner && <li>Bạn là <strong>Owner</strong> của Workspace này. Bạn có toàn quyền quản lý thành viên và phân quyền.</li>}
        </ul>
      </section>
    </div>
  );
}
