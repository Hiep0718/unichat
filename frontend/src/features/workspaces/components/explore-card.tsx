/**
 * A public group someone has not joined yet.
 *
 * Built like the cards on the main list — picture behind, text over it — so
 * Khám phá and Không gian của tôi do not read as two different products. What
 * differs is the one thing that matters here: a join button.
 */

import { Icon } from '../../../components/icon';
import { MemberFaces } from './member-faces';
import { WorkspaceCover } from './workspace-cover';

import type { WorkspaceDto } from '../workspace-schema';

import './explore-card.css';

interface ExploreCardProps {
  readonly workspace: WorkspaceDto;
  readonly animationIndex?: number;
  readonly onJoin: (workspaceId: string) => void;
  readonly isJoining: boolean;
}

/**
 * Renders a public workspace card with a join button.
 */
export function ExploreCard({ workspace, animationIndex = 0, onJoin, isJoining }: ExploreCardProps) {
  return (
    <div
      className="explore-card"
      style={{ '--card-index': animationIndex } as React.CSSProperties}
    >
      <WorkspaceCover
        workspaceId={workspace.id}
        name={workspace.name}
        hasCover={workspace.hasCover}
      />
      <span className="explore-card__scrim" />

      <span className="explore-card__badge">
        <Icon name="public" size={13} />
        Công khai
      </span>

      <div className="explore-card__content">
        <h3 className="explore-card__name">{workspace.name}</h3>
        {workspace.description?.trim() && (
          <p className="explore-card__desc">{workspace.description}</p>
        )}

        <div className="explore-card__foot">
          <div className="explore-card__facts">
            <MemberFaces
              faces={workspace.faces}
              memberCount={workspace.memberCount}
              size={22}
            />
            <span className="explore-card__meta">
              <Icon name="description" size={14} />
              {workspace.documentCount} tài liệu
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
    </div>
  );
}
