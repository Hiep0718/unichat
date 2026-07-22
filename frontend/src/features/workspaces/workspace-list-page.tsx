/**
 * Workspace list page for authenticated users.
 * Fetches workspaces from API, supports search and visibility filter.
 */

import { useCallback, useMemo, useState } from 'react';

import { Icon } from '../../components/icon';
import { WorkspaceCard } from './components/workspace-card';
import { WorkspaceForm } from './components/workspace-form';
import { SkeletonCard } from './components/skeleton-card';
import { useWorkspaces } from './workspace-hooks';

import type { WorkspaceVisibility } from './workspace-schema';

import './workspace-list-page.css';

type FilterOption = 'ALL' | WorkspaceVisibility;

const FILTER_OPTIONS: readonly { value: FilterOption; label: string }[] = [
  { value: 'ALL', label: 'Tất cả' },
  { value: 'PRIVATE', label: 'Riêng tư' },
  { value: 'SHARED', label: 'Được chia sẻ' },
  { value: 'PUBLIC', label: 'Công khai' },
];

/** Number of skeleton cards to show during loading. */
const SKELETON_COUNT = 3;

/**
 * Renders the workspace list page with search, filter, and create modal.
 */
function WorkspaceListPage() {
  const { data, isLoading, error, refetch } = useWorkspaces();

  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<FilterOption>('ALL');
  const [isFormOpen, setIsFormOpen] = useState(false);

  const handleSearchChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setSearchQuery(e.target.value);
    },
    [],
  );

  const filteredWorkspaces = useMemo(() => {
    const workspaces = data?.content ?? [];
    const query = searchQuery.toLowerCase().trim();

    return workspaces.filter((ws) => {
      const matchesFilter = activeFilter === 'ALL' || ws.visibility === activeFilter;
      const matchesSearch = !query
        || ws.name.toLowerCase().includes(query)
        || ws.description?.toLowerCase().includes(query);
      return matchesFilter && matchesSearch;
    });
  }, [data?.content, searchQuery, activeFilter]);

  return (
    <main className="workspace-main">
      <header className="workspace-header">
        <div className="workspace-header__top">
          <h2 className="workspace-header__title">Workspace của tôi</h2>
          <button
            className="workspace-header__create-btn"
            type="button"
            onClick={() => setIsFormOpen(true)}
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
              onChange={handleSearchChange}
            />
          </div>

          <div className="workspace-filters">
            {FILTER_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                className={`workspace-filter ${activeFilter === opt.value ? 'workspace-filter--active' : ''}`}
                onClick={() => setActiveFilter(opt.value)}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>
      </header>

      <div className="workspace-content">
        {isLoading && (
          <div className="workspace-grid">
            {Array.from({ length: SKELETON_COUNT }, (_, i) => (
              <SkeletonCard key={i} />
            ))}
          </div>
        )}

        {error && (
          <div className="workspace-empty">
            <Icon name="error" size={48} />
            <h3 className="workspace-empty__title">Không thể tải dữ liệu</h3>
            <p className="workspace-empty__desc">
              Đã xảy ra lỗi khi tải danh sách workspace. Vui lòng thử lại.
            </p>
            <button
              className="workspace-empty__action"
              type="button"
              onClick={() => refetch()}
            >
              Thử lại
            </button>
          </div>
        )}

        {!isLoading && !error && filteredWorkspaces.length === 0 && (
          <div className="workspace-empty">
            <Icon name="folder_open" size={48} />
            <h3 className="workspace-empty__title">
              {searchQuery || activeFilter !== 'ALL'
                ? 'Không tìm thấy workspace'
                : 'Chưa có workspace nào'}
            </h3>
            <p className="workspace-empty__desc">
              {searchQuery || activeFilter !== 'ALL'
                ? 'Thử thay đổi từ khóa hoặc bộ lọc.'
                : 'Tạo workspace đầu tiên để bắt đầu tổ chức tài liệu của bạn.'}
            </p>
            {!searchQuery && activeFilter === 'ALL' && (
              <button
                className="workspace-empty__action"
                type="button"
                onClick={() => setIsFormOpen(true)}
              >
                <Icon name="add" size={18} />
                Tạo Workspace
              </button>
            )}
          </div>
        )}

        {!isLoading && !error && filteredWorkspaces.length > 0 && (
          <div className="workspace-grid">
            {filteredWorkspaces.map((ws) => (
              <WorkspaceCard
                key={ws.id}
                id={ws.id}
                name={ws.name}
                description={ws.description ?? ''}
                visibility={ws.visibility}
                documentCount={ws.documentCount}
                memberCount={ws.memberCount}
                updatedAt={ws.updatedAt}
              />
            ))}
          </div>
        )}
      </div>

      <WorkspaceForm open={isFormOpen} onClose={() => setIsFormOpen(false)} />
    </main>
  );
}

export default WorkspaceListPage;
