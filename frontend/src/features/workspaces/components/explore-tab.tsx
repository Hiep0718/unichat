/**
 * Explore tab displaying public workspaces that the user can join.
 */

import { useCallback, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { Icon } from '../../../components/icon';
import { ExploreCard } from './explore-card';
import { SkeletonCard } from './skeleton-card';
import { usePublicWorkspaces, useJoinWorkspace } from '../workspace-hooks';

import './explore-tab.css';

const SKELETON_COUNT = 3;

export function ExploreTab() {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  
  const { data, isLoading, error, refetch } = usePublicWorkspaces(searchQuery, 0);
  const joinMutation = useJoinWorkspace();

  const handleSearchChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setSearchQuery(e.target.value);
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

  return (
    <section className="explore-tab" aria-label="Khám phá">
      <div className="explore-tab__header">
        <h3 className="explore-tab__title">
          <Icon name="travel_explore" size={20} />
          Khám phá không gian tri thức
        </h3>
        <p className="workspace-empty__desc" style={{ textAlign: 'left', margin: 0, maxWidth: '100%' }}>
          Tìm kiếm và tham gia các không gian tri thức công khai từ cộng đồng UniChat.
        </p>
      </div>

      <div className="workspace-controls">
        <div className="workspace-search">
          <Icon name="search" size={20} className="workspace-search__icon" />
          <input
            className="workspace-search__input"
            type="text"
            placeholder="Tìm kiếm không gian công khai..."
            value={searchQuery}
            onChange={handleSearchChange}
          />
        </div>
      </div>

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
              Không tìm thấy workspace công khai nào phù hợp.
            </p>
          </div>
        )}

        {!isLoading && !error && workspaces.length > 0 && (
          <div className="explore-grid">
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
    </section>
  );
}
