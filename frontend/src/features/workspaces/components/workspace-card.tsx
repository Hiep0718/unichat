/**
 * Workspace card component displaying workspace info, badge, and stats.
 * Supports hover elevation and staggered entrance animation.
 */

import { Link } from 'react-router-dom';

import { Icon } from '../../../components/icon';
import { formatRelativeTime } from '../../../lib/format-time';

import type { WorkspaceVisibility } from '../workspace-schema';

import './workspace-card.css';

interface WorkspaceCardProps {
  readonly id: string;
  readonly name: string;
  readonly description: string;
  readonly visibility: WorkspaceVisibility;
  readonly documentCount: number;
  readonly memberCount: number;
  readonly updatedAt: string;
  /** Index used for staggered entrance animation delay. */
  readonly animationIndex?: number;
}

const BADGE_CONFIG: Record<WorkspaceVisibility, { icon: string; label: string; className: string }> = {
  PUBLIC: { icon: 'public', label: 'Công khai', className: 'workspace-card__badge--public' },
  PRIVATE: { icon: 'lock', label: 'Riêng tư', className: 'workspace-card__badge--private' },
  SHARED: { icon: 'group_add', label: 'Được chia sẻ', className: 'workspace-card__badge--shared' },
};

/**
 * Renders a single workspace card with visibility badge, metadata, and link.
 */
export function WorkspaceCard({
  id,
  name,
  description,
  visibility,
  documentCount,
  memberCount,
  updatedAt,
  animationIndex = 0,
}: WorkspaceCardProps) {
  const badge = BADGE_CONFIG[visibility];
  const borderClass = `workspace-card--${visibility.toLowerCase()}`;

  return (
    <Link
      to={`/workspaces/${id}`}
      className={`workspace-card ${borderClass}`}
      style={{ '--card-index': animationIndex } as React.CSSProperties}
    >
      <div className="workspace-card__header">
        <span className={`workspace-card__badge ${badge.className}`}>
          <Icon name={badge.icon} size={14} />
          {badge.label}
        </span>
        <button
          className="workspace-card__menu"
          type="button"
          aria-label="Thêm tùy chọn"
          onClick={(e) => e.preventDefault()}
        >
          <Icon name="more_vert" size={20} />
        </button>
      </div>

      <div className="workspace-card__body">
        <h3 className="workspace-card__name">{name}</h3>
        <p className="workspace-card__desc">{description}</p>
      </div>

      <div className="workspace-card__footer">
        <div className="workspace-card__stats">
          <span className="workspace-card__stat">
            <Icon name="description" size={16} />
            {documentCount} Tài liệu
          </span>
          <span className="workspace-card__stat">
            <Icon name={memberCount === 1 ? 'person' : 'group'} size={16} />
            {memberCount} Thành viên
          </span>
        </div>
        <div className="workspace-card__updated">
          Cập nhật: {formatRelativeTime(updatedAt)}
        </div>
      </div>
    </Link>
  );
}
