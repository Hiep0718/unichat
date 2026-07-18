/**
 * Workspace card component displaying workspace info, badge, and stats.
 */

import { Icon } from '../../../components/icon';
import './workspace-card.css';

type Visibility = 'PUBLIC' | 'PRIVATE' | 'SHARED';

interface WorkspaceCardProps {
  readonly name: string;
  readonly description: string;
  readonly visibility: Visibility;
  readonly documentCount: number;
  readonly memberCount: number;
  readonly updatedAt: string;
}

const BADGE_CONFIG: Record<Visibility, { icon: string; label: string; className: string }> = {
  PUBLIC: { icon: 'public', label: 'Công khai', className: 'workspace-card__badge--public' },
  PRIVATE: { icon: 'lock', label: 'Riêng tư', className: 'workspace-card__badge--private' },
  SHARED: { icon: 'group_add', label: 'Được chia sẻ', className: 'workspace-card__badge--shared' },
};

/**
 * Renders a single workspace card with visibility badge and metadata.
 */
export function WorkspaceCard({
  name,
  description,
  visibility,
  documentCount,
  memberCount,
  updatedAt,
}: WorkspaceCardProps) {
  const badge = BADGE_CONFIG[visibility];

  return (
    <div className="workspace-card">
      <div className="workspace-card__header">
        <span className={`workspace-card__badge ${badge.className}`}>
          <Icon name={badge.icon} size={14} />
          {badge.label}
        </span>
        <button
          className="workspace-card__menu"
          type="button"
          aria-label="Thêm tùy chọn"
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
          Cập nhật: {updatedAt}
        </div>
      </div>
    </div>
  );
}
