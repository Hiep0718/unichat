/**
 * A group as it appears in a list.
 *
 * The picture fills the whole card and the text sits on top of it, rather than
 * the picture being a band above a white panel — a card split into two zones
 * reads as a form, not as something worth clicking.
 *
 * What is written over it is chosen for the same reason: faces rather than a
 * member count, and recent posts rather than total posts, because a group with
 * a long history and a quiet month should read as quiet.
 *
 * The description is deliberately not here. Most groups have none, so the line
 * was "Chưa có mô tả" on most cards; worse, the cards that did have one pushed
 * their title higher than their neighbours', leaving a row of titles at two
 * different heights. It is on the group's own page, where there is room for it.
 */

import { Link } from 'react-router-dom';

import { MemberFaces } from './member-faces';
import { WorkspaceCover } from './workspace-cover';
import { Icon } from '../../../components/icon';
import { formatRelativeTime } from '../../../lib/format-time';

import type { WorkspaceFace, WorkspaceVisibility } from '../workspace-schema';

import './workspace-card.css';

interface WorkspaceCardProps {
  readonly id: string;
  readonly name: string;
  readonly visibility: WorkspaceVisibility;
  readonly documentCount: number;
  readonly memberCount: number;
  readonly recentPostCount: number;
  readonly faces: readonly WorkspaceFace[];
  readonly hasCover: boolean;
  readonly updatedAt: string;
  /** Index used for staggered entrance animation delay. */
  readonly animationIndex?: number;
}

const BADGE_CONFIG: Record<WorkspaceVisibility, { icon: string; label: string }> = {
  PUBLIC: { icon: 'public', label: 'Công khai' },
  PRIVATE: { icon: 'lock', label: 'Riêng tư' },
  SHARED: { icon: 'group_add', label: 'Được chia sẻ' },
};

/**
 * Renders a single workspace card: picture behind, identity and activity over.
 */
export function WorkspaceCard({
  id,
  name,
  visibility,
  documentCount,
  memberCount,
  recentPostCount,
  faces,
  hasCover,
  updatedAt,
  animationIndex = 0,
}: WorkspaceCardProps) {
  const badge = BADGE_CONFIG[visibility];

  return (
    <Link
      to={`/workspaces/${id}`}
      className="workspace-card"
      style={{ '--card-index': animationIndex } as React.CSSProperties}
    >
      <WorkspaceCover workspaceId={id} name={name} hasCover={hasCover} />

      {/* Darkens only the lower half, so the picture stays visible while the
          title over it keeps its contrast whatever was uploaded. */}
      <span className="workspace-card__scrim" />

      <span className="workspace-card__badge">
        <Icon name={badge.icon} size={13} />
        {badge.label}
      </span>

      <div className="workspace-card__content">
        <h3 className="workspace-card__name">{name}</h3>

        <div className="workspace-card__foot">
          <MemberFaces faces={faces} memberCount={memberCount} size={24} />
          <span className="workspace-card__meta">
            <Icon name="description" size={14} />
            {documentCount}
            <span className="workspace-card__dot">·</span>
            <Activity recentPostCount={recentPostCount} updatedAt={updatedAt} />
          </span>
        </div>
      </div>
    </Link>
  );
}

/**
 * Says what has happened lately, falling back to when the group last changed.
 *
 * "Cập nhật 2 tuần trước" on every card was the least useful line on it; a
 * group with posts this week says so instead.
 */
function Activity({
  recentPostCount,
  updatedAt,
}: {
  readonly recentPostCount: number;
  readonly updatedAt: string;
}) {
  if (recentPostCount > 0) {
    return (
      <span className="workspace-card__live">
        <span className="workspace-card__pulse" aria-hidden="true" />
        {recentPostCount} bài tuần này
      </span>
    );
  }
  return <span>{formatRelativeTime(updatedAt)}</span>;
}
