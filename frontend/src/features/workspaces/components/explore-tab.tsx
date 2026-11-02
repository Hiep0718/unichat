/**
 * Explore tab displaying public workspaces that the user can join.
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { Icon } from '../../../components/icon';
import { ExploreCard } from './explore-card';
import { CoverAssignmentProvider } from '../cover-assignment';
import { SkeletonCard } from './skeleton-card';
import { usePublicWorkspaces, useJoinWorkspace } from '../workspace-hooks';
import { useDiscoverableTopics } from '../workspace-topics';

import './explore-tab.css';

const SKELETON_COUNT = 3;

export function ExploreTab() {
  const navigate = useNavigate();
  const [searchInput, setSearchInput] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [topic, setTopic] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'GRID' | 'LIST'>('GRID');

  // Typing fired one request per keystroke before this; 300 ms is the figure
  // the feed page already uses and the engineering standards require.
  useEffect(() => {
    const timer = setTimeout(() => setSearchQuery(searchInput), 300);
    return () => clearTimeout(timer);
  }, [searchInput]);

  const { data: topics } = useDiscoverableTopics();
  const { data, isLoading, error, refetch } = usePublicWorkspaces(
    searchQuery,
    0,
    topic ?? undefined,
  );
  const joinMutation = useJoinWorkspace();

  const handleSearchChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setSearchInput(e.target.value);
    },
    [],
  );

  const handleJoin = useCallback(
    (workspaceId: string) => {
      joinMutation.mutate(workspaceId, {
        onSuccess: (joinedWorkspace) => {
          navigate(`/workspaces/${joinedWorkspace.id}`);
        },
      });
    },
    [joinMutation, navigate],
  );

  const workspaces = useMemo(() => data?.content ?? [], [data?.content]);
  const gridClass = viewMode === 'LIST' ? 'explore-grid explore-grid--list' : 'explore-grid';

  const coverIds = useMemo(() => workspaces.map((ws) => ws.id), [workspaces]);

  return (
    <section className="explore-tab" aria-label="Khám phá">
      <CoverAssignmentProvider workspaceIds={coverIds}>
      <div className="explore-tab__header">
        <h3 className="explore-tab__title">
          <Icon name="travel_explore" size={20} />
          Khám phá không gian tri thức
        </h3>
        <p className="workspace-empty__desc" style={{ textAlign: 'left', margin: 0, maxWidth: '100%' }}>
          Tìm kiếm và tham gia các không gian tri thức công khai từ cộng đồng UniChat.
        </p>
      </div>

      <div className="workspace-controls" style={{ display: 'flex', justifyContent: 'space-between', width: '100%' }}>
        <div className="workspace-search">
          <Icon name="search" size={20} className="workspace-search__icon" />
          <input
            className="workspace-search__input"
            type="text"
            placeholder="Tìm kiếm không gian công khai..."
            value={searchInput}
            onChange={handleSearchChange}
          />
        </div>

        <div className="workspace-actions-group">
          <div className="workspace-view-toggle">
            <button
              className={`view-toggle-btn ${viewMode === 'GRID' ? 'view-toggle-btn--active' : ''}`}
              type="button"
              aria-label="Grid view"
              onClick={() => setViewMode('GRID')}
            >
              <Icon name="grid_view" size={18} />
            </button>
            <button
              className={`view-toggle-btn ${viewMode === 'LIST' ? 'view-toggle-btn--active' : ''}`}
              type="button"
              aria-label="List view"
              onClick={() => setViewMode('LIST')}
            >
              <Icon name="view_list" size={18} />
            </button>
          </div>
        </div>
      </div>

      {topics && topics.length > 0 && (
        <div className="explore-topics" role="group" aria-label="Lọc theo chủ đề">
          <button
            type="button"
            className={`explore-topics__chip ${topic === null ? 'explore-topics__chip--active' : ''}`}
            aria-pressed={topic === null}
            onClick={() => setTopic(null)}
          >
            Tất cả
          </button>
          {topics.map((option) => (
            <button
              key={option.name}
              type="button"
              className={`explore-topics__chip ${topic === option.name ? 'explore-topics__chip--active' : ''}`}
              aria-pressed={topic === option.name}
              // Pressing the active chip clears the filter, so there is always
              // a way back without hunting for "Tất cả".
              onClick={() => setTopic((current) => (current === option.name ? null : option.name))}
            >
              <Icon name={option.icon} size={15} />
              {option.label}
              <span className="explore-topics__count">{option.count}</span>
            </button>
          ))}
        </div>
      )}

      <div className="workspace-content">
        {isLoading && (
          <div className="explore-grid">
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
              Đã xảy ra lỗi khi tải danh sách khám phá.
            </p>
            <button className="workspace-empty__action" type="button" onClick={() => refetch()}>
              Thử lại
            </button>
          </div>
        )}

        {!isLoading && !error && workspaces.length === 0 && (
          <div className="workspace-empty">
            <Icon name="travel_explore" size={48} />
            <h3 className="workspace-empty__title">Không có kết quả</h3>
            <p className="workspace-empty__desc">
              {topic
                ? 'Chưa có nhóm công khai nào thuộc chủ đề này.'
                : 'Không tìm thấy workspace công khai nào phù hợp.'}
            </p>
            {topic && (
              <button
                className="workspace-empty__action"
                type="button"
                onClick={() => setTopic(null)}
              >
                Xem tất cả chủ đề
              </button>
            )}
          </div>
        )}

        {!isLoading && !error && workspaces.length > 0 && (
          <div className={gridClass}>
            {workspaces.map((ws, i) => (
              <ExploreCard
                key={ws.id}
                workspace={ws}
                animationIndex={i}
                onJoin={handleJoin}
                isJoining={joinMutation.isPending && joinMutation.variables === ws.id}
              />
            ))}
          </div>
        )}
      </div>
    </CoverAssignmentProvider>
    </section>
  );
}
