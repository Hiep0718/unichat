/**
 * Workspace dashboard page — the main landing after login.
 * Shows welcome banner, quick stats, recent workspaces, and full workspace grid.
 */

import { useCallback, useMemo, useState } from 'react';

import { Icon } from '../../components/icon';
import { WelcomeBanner } from './components/welcome-banner';
import { QuickStats } from './components/quick-stats';
import { WorkspaceCard } from './components/workspace-card';
import { WorkspaceForm } from './components/workspace-form';
import { SkeletonCard } from './components/skeleton-card';
import { ExploreTab } from './components/explore-tab';
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
/** Number of recent workspaces to show in the quick access section. */
const RECENT_COUNT = 3;

/**
 * Renders the workspace dashboard with welcome banner, stats, and workspace grid.
 */
function WorkspaceListPage() {
  const { data, isLoading, error, refetch } = useWorkspaces();

  const [activeTab, setActiveTab] = useState<'MY_WORKSPACES' | 'EXPLORE'>('MY_WORKSPACES');
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<FilterOption>('ALL');
  const [isFormOpen, setIsFormOpen] = useState(false);

  const handleSearchChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setSearchQuery(e.target.value);
    },
    [],
  );

  const allWorkspaces = useMemo(() => data?.content ?? [], [data?.content]);

  const recentWorkspaces = useMemo(() => {
    return [...allWorkspaces]
      .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
      .slice(0, RECENT_COUNT);
  }, [allWorkspaces]);

  const filteredWorkspaces = useMemo(() => {
    const query = searchQuery.toLowerCase().trim();
    return allWorkspaces.filter((ws) => {
      const matchesFilter = activeFilter === 'ALL' || ws.visibility === activeFilter;
      const matchesSearch = !query
        || ws.name.toLowerCase().includes(query)
        || ws.description?.toLowerCase().includes(query);
      return matchesFilter && matchesSearch;
    });
  }, [allWorkspaces, searchQuery, activeFilter]);

  return (
    <main className="workspace-main">
      <div className="workspace-dashboard">
        <WelcomeBanner />

        <div className="dashboard-tabs">
          <button
            className={`dashboard-tab ${activeTab === 'MY_WORKSPACES' ? 'dashboard-tab--active' : ''}`}
            type="button"
            onClick={() => setActiveTab('MY_WORKSPACES')}
          >
            <Icon name="folder" size={18} />
            Không gian của tôi
          </button>
          <button
            className={`dashboard-tab ${activeTab === 'EXPLORE' ? 'dashboard-tab--active' : ''}`}
            type="button"
            onClick={() => setActiveTab('EXPLORE')}
          >
            <Icon name="travel_explore" size={18} />
            Khám phá
          </button>
        </div>

        {activeTab === 'MY_WORKSPACES' ? (
          <>
            {!isLoading && !error && allWorkspaces.length > 0 && (
              <QuickStats workspaces={allWorkspaces} />
            )}

            {!isLoading && !error && recentWorkspaces.length > 0 && (
              <RecentSection workspaces={recentWorkspaces} />
            )}

            <AllWorkspacesSection
              isLoading={isLoading}
              error={error}
              searchQuery={searchQuery}
              activeFilter={activeFilter}
              filteredWorkspaces={filteredWorkspaces}
              onSearchChange={handleSearchChange}
              onFilterChange={setActiveFilter}
              onCreateClick={() => setIsFormOpen(true)}
              onRetry={() => refetch()}
            />
          </>
        ) : (
          <ExploreTab />
        )}
      </div>

      <WorkspaceForm open={isFormOpen} onClose={() => setIsFormOpen(false)} />
    </main>
  );
}

export default WorkspaceListPage;

/* ---------- Sub-components kept in the same file (small, tightly coupled) ---------- */

import type { WorkspaceDto } from './workspace-schema';

interface RecentSectionProps {
  readonly workspaces: readonly WorkspaceDto[];
}

/**
 * Quick-access row of recently updated workspaces.
 */
function RecentSection({ workspaces }: RecentSectionProps) {
  return (
    <section className="recent-section">
      <h3 className="recent-section__title">
        <Icon name="bolt" size={20} />
        Truy cập nhanh
      </h3>
      <div className="recent-section__grid">
        {workspaces.map((ws, i) => (
          <WorkspaceCard
            key={ws.id}
            id={ws.id}
            name={ws.name}
            description={ws.description ?? ''}
            visibility={ws.visibility}
            documentCount={ws.documentCount}
            memberCount={ws.memberCount}
            updatedAt={ws.updatedAt}
            animationIndex={i}
          />
        ))}
      </div>
    </section>
  );
}

interface AllWorkspacesSectionProps {
  readonly isLoading: boolean;
  readonly error: Error | null;
  readonly searchQuery: string;
  readonly activeFilter: FilterOption;
  readonly filteredWorkspaces: readonly WorkspaceDto[];
  readonly onSearchChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  readonly onFilterChange: (filter: FilterOption) => void;
  readonly onCreateClick: () => void;
  readonly onRetry: () => void;
}

/**
 * Full workspace list with search, filters, and grid.
 */
function AllWorkspacesSection({
  isLoading,
  error,
  searchQuery,
  activeFilter,
  filteredWorkspaces,
  onSearchChange,
  onFilterChange,
  onCreateClick,
  onRetry,
}: AllWorkspacesSectionProps) {
  return (
    <section className="all-workspaces-section">
      <div className="all-workspaces-section__header">
        <h3 className="all-workspaces-section__title">
          <Icon name="folder" size={20} />
          Tất cả Workspace
        </h3>
        <button
          className="workspace-header__create-btn"
          type="button"
          onClick={onCreateClick}
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
            onChange={onSearchChange}
          />
        </div>

        <div className="workspace-filters">
          {FILTER_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              className={`workspace-filter ${activeFilter === opt.value ? 'workspace-filter--active' : ''}`}
              onClick={() => onFilterChange(opt.value)}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      <div className="workspace-content">
        {isLoading && (
          <div className="workspace-grid">
            {Array.from({ length: SKELETON_COUNT }, (_, i) => (
              <SkeletonCard key={i} />
            ))}
          </div>
        )}

        {error && <ErrorState onRetry={onRetry} />}

        {!isLoading && !error && filteredWorkspaces.length === 0 && (
          <EmptyState
            hasFilters={!!searchQuery || activeFilter !== 'ALL'}
            onCreateClick={onCreateClick}
          />
        )}

        {!isLoading && !error && filteredWorkspaces.length > 0 && (
          <div className="workspace-grid">
            {filteredWorkspaces.map((ws, i) => (
              <WorkspaceCard
                key={ws.id}
                id={ws.id}
                name={ws.name}
                description={ws.description ?? ''}
                visibility={ws.visibility}
                documentCount={ws.documentCount}
                memberCount={ws.memberCount}
                updatedAt={ws.updatedAt}
                animationIndex={i}
              />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

interface ErrorStateProps {
  readonly onRetry: () => void;
}

function ErrorState({ onRetry }: ErrorStateProps) {
  return (
    <div className="workspace-empty">
      <Icon name="error" size={48} />
      <h3 className="workspace-empty__title">Không thể tải dữ liệu</h3>
      <p className="workspace-empty__desc">
        Đã xảy ra lỗi khi tải danh sách workspace. Vui lòng thử lại.
      </p>
      <button className="workspace-empty__action" type="button" onClick={onRetry}>
        Thử lại
      </button>
    </div>
  );
}

interface EmptyStateProps {
  readonly hasFilters: boolean;
  readonly onCreateClick: () => void;
}

function EmptyState({ hasFilters, onCreateClick }: EmptyStateProps) {
  return (
    <div className="workspace-empty">
      <Icon name="folder_open" size={48} />
      <h3 className="workspace-empty__title">
        {hasFilters ? 'Không tìm thấy workspace' : 'Chưa có workspace nào'}
      </h3>
      <p className="workspace-empty__desc">
        {hasFilters
          ? 'Thử thay đổi từ khóa hoặc bộ lọc.'
          : 'Tạo workspace đầu tiên để bắt đầu tổ chức tài liệu của bạn.'}
      </p>
      {!hasFilters && (
        <button className="workspace-empty__action" type="button" onClick={onCreateClick}>
          <Icon name="add" size={18} />
          Tạo Workspace
        </button>
      )}
    </div>
  );
}
