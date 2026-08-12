/**
 * Explore card for public workspaces — displays workspace info with a join button.
 * Shows community metadata: category, member count, document count, join policy.
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

/** Renders a public workspace card with join button and community info. */
export function ExploreCard({ workspace, animationIndex = 0, onJoin, isJoining }: ExploreCardProps) {
  const needsApproval = workspace.joinPolicy === 'REQUEST_APPROVAL';
  const joinLabel = needsApproval ? 'Xin tham gia' : 'Tham gia';
  const joiningLabel = needsApproval ? 'Đang gửi...' : 'Đang tham gia...';

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
        {workspace.category && (
          <span className="explore-card__category">
            {workspace.category}
          </span>
        )}
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
          {workspace.questionCount > 0 && (
            <span className="explore-card__stat">
              <Icon name="forum" size={16} />
              {workspace.questionCount} Câu hỏi
            </span>
          )}
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
          <Icon name={needsApproval ? 'how_to_reg' : 'login'} size={16} />
          {isJoining ? joiningLabel : joinLabel}
        </button>
      </div>
    </div>
  );
}
