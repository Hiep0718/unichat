/**
 * Explore card for public workspaces — displays workspace info with a join button.
 */

import { Icon } from '../../../components/icon';
import { formatRelativeTime } from '../../../lib/format-time';

import type { WorkspaceDto } from '../workspace-schema';

import './explore-card.css';

interface ExploreCardProps {
  readonly workspace: WorkspaceDto;
  readonly animationIndex?: number;
  readonly onJoin: (workspaceId: string) => void;
  readonly isJoining: boolean;
}

/**
 * Renders a public workspace card with join button.
 */
export function ExploreCard({ workspace, animationIndex = 0, onJoin, isJoining }: ExploreCardProps) {
  return (
    <div
      className="explore-card"
      style={{ '--card-index': animationIndex } as React.CSSProperties}
    >
      <div className="explore-card__header">
        <span className="explore-card__badge">
          <Icon name="public" size={14} />
          Công khai
        </span>
      </div>

      <div className="explore-card__body">
        <h3 className="explore-card__name">{workspace.name}</h3>
        <p className="explore-card__desc">{workspace.description}</p>
      </div>

      <div className="explore-card__footer">
        <div className="explore-card__stats">
          <span className="explore-card__stat">
            <Icon name="description" size={16} />
            {workspace.documentCount} Tài liệu
          </span>
          <span className="explore-card__stat">
            <Icon name="group" size={16} />
            {workspace.memberCount} Thành viên
          </span>
          <span className="explore-card__stat">
            Cập nhật: {formatRelativeTime(workspace.updatedAt)}
          </span>
        </div>
        <button
          className="explore-card__join-btn"
          type="button"
          disabled={isJoining}
          onClick={() => onJoin(workspace.id)}
        >
          <Icon name="login" size={16} />
          {isJoining ? 'Đang tham gia...' : 'Tham gia'}
        </button>
      </div>
    </div>
  );
}
