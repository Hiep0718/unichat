import { useEffect, useState } from 'react';
import { Icon } from '../../components/icon';
import { WorkspaceCard } from './components/workspace-card';
import { CreateWorkspaceModal } from './components/create-workspace-modal';
import { fetchWorkspaces, WorkspaceResponse, WorkspaceVisibility } from './workspace-api';
import './workspace-list-page.css';

function WorkspaceListPage() {
  const [workspaces, setWorkspaces] = useState<WorkspaceResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [visibilityFilter, setVisibilityFilter] = useState<'ALL' | WorkspaceVisibility>('ALL');
  const [isModalOpen, setIsModalOpen] = useState(false);

  const refreshWorkspaces = () => {
    fetchWorkspaces(0, 50)
      .then((res) => {
        setWorkspaces(res.content || []);
        setError(null);
      })
      .catch((err: unknown) => {
        setError(err instanceof Error ? err.message : 'Không thể tải danh sách Workspace');
      });
  };

  useEffect(() => {
    let mounted = true;
    fetchWorkspaces(0, 50)
      .then((res) => {
        if (mounted) {
          setWorkspaces(res.content || []);
          setError(null);
        }
      })
      .catch((err: unknown) => {
        if (mounted) {
          setError(err instanceof Error ? err.message : 'Không thể tải danh sách Workspace');
        }
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, []);

  const filteredWorkspaces = workspaces.filter((ws) => {
    const matchesSearch =
      ws.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (ws.description && ws.description.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesVisibility =
      visibilityFilter === 'ALL' || ws.visibility === visibilityFilter;

    return matchesSearch && matchesVisibility;
  });

  return (
    <main className="workspace-main">
      <header className="workspace-header">
        <div className="workspace-header__top">
          <h2 className="workspace-header__title">Knowledge Spaces của bạn</h2>
          <button
            className="workspace-header__create-btn"
            type="button"
            onClick={() => setIsModalOpen(true)}
          >
            <Icon name="add" size={18} />
            Tạo Workspace
          </button>
        </div>

        <div className="workspace-controls">
          <div className="workspace-search">
            <Icon name="search" size={20} className="workspace-search__icon" />
            <input
              className="workspace-search__input"
              type="text"
              placeholder="Tìm kiếm workspace..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          <div className="workspace-filters">
            <button
              type="button"
              className={`workspace-filter ${visibilityFilter === 'ALL' ? 'workspace-filter--active' : ''}`}
              onClick={() => setVisibilityFilter('ALL')}
            >
              Tất cả
            </button>
            <button
              type="button"
              className={`workspace-filter ${visibilityFilter === 'PRIVATE' ? 'workspace-filter--active' : ''}`}
              onClick={() => setVisibilityFilter('PRIVATE')}
            >
              Riêng tư
            </button>
            <button
              type="button"
              className={`workspace-filter ${visibilityFilter === 'SHARED' ? 'workspace-filter--active' : ''}`}
              onClick={() => setVisibilityFilter('SHARED')}
            >
              Được chia sẻ
            </button>
            <button
              type="button"
              className={`workspace-filter ${visibilityFilter === 'PUBLIC' ? 'workspace-filter--active' : ''}`}
              onClick={() => setVisibilityFilter('PUBLIC')}
            >
              Công khai
            </button>
          </div>
        </div>
      </header>

      <div className="workspace-content">
        {loading ? (
          <div style={{ textAlign: 'center', padding: '3rem 1rem', color: '#64748b' }}>
            Đang tải danh sách Workspace...
          </div>
        ) : error ? (
          <div style={{ textAlign: 'center', padding: '3rem 1rem', color: '#e11d48' }}>
            <p style={{ marginBottom: '1rem' }}>{error}</p>
            <button
              type="button"
              style={{ padding: '0.5rem 1rem', background: '#0284c7', color: '#fff', border: 'none', borderRadius: '0.375rem', cursor: 'pointer' }}
              onClick={refreshWorkspaces}
            >
              Thử lại
            </button>
          </div>
        ) : filteredWorkspaces.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '4rem 1rem', color: '#64748b' }}>
            <Icon name="folder_open" size={48} style={{ color: '#cbd5e1', marginBottom: '1rem' }} />
            <h3 style={{ fontSize: '1.125rem', color: '#334155', marginBottom: '0.5rem' }}>
              Chưa có Workspace nào
            </h3>
            <p style={{ marginBottom: '1.5rem' }}>
              Tạo Workspace đầu tiên để bắt đầu lưu trữ tài liệu và truy xuất tri thức AI.
            </p>
            <button
              type="button"
              className="workspace-header__create-btn"
              onClick={() => setIsModalOpen(true)}
            >
              <Icon name="add" size={18} />
              Tạo Workspace ngay
            </button>
          </div>
        ) : (
          <div className="workspace-grid">
            {filteredWorkspaces.map((ws) => (
              <WorkspaceCard
                key={ws.id}
                id={ws.id}
                name={ws.name}
                description={ws.description || ''}
                visibility={ws.visibility}
                documentCount={ws.documentCount || 0}
                memberCount={ws.memberCount || 1}
                updatedAt={ws.updatedAt ? new Date(ws.updatedAt).toLocaleDateString('vi-VN') : ''}
              />
            ))}
          </div>
        )}
      </div>

      <CreateWorkspaceModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={() => refreshWorkspaces()}
      />
    </main>
  );
}

export default WorkspaceListPage;
