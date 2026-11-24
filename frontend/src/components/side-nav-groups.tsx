/**
 * Joined groups list in the sidebar ("Nhóm của bạn" on Home, "Chuyển nhóm nhanh"
 * when inside an active workspace).
 */
import { Link } from 'react-router-dom';

import { GroupMark } from '../features/workspaces/components/group-mark';
import { Icon } from './icon';

import type { SideNavGroup } from './side-nav-group-list';

interface SideNavGroupsProps {
  readonly groups: readonly SideNavGroup[];
  readonly totalCount?: number | undefined;
  readonly sectionTitle?: string;
  readonly activeGroupId?: string | undefined;
  readonly onNavigate?: () => void;
}

/** Renders the scrollable joined groups list with create and view-all actions. */
export function SideNavGroups({
  groups,
  totalCount,
  sectionTitle = 'Workspace của bạn',
  activeGroupId,
  onNavigate,
}: SideNavGroupsProps) {
  if (groups.length === 0) {
    return null;
  }
  const hasMore = totalCount !== undefined && totalCount > groups.length;

  return (
    <section className="side-nav__groups-section" aria-label={sectionTitle}>
      <div className="side-nav__section-row">
        <p className="side-nav__section">{sectionTitle}</p>
        <Link
          to="/workspaces?new=1"
          className="side-nav__section-add"
          title="Tạo Workspace mới"
          aria-label="Tạo Workspace mới"
          onClick={onNavigate}
        >
          <Icon name="add" size={16} rounded />
        </Link>
      </div>
      {groups.map((group) => {
        const isOpen = group.id === activeGroupId;
        return (
          <Link
            key={group.id}
            to={`/workspaces/${group.id}`}
            className={`side-nav__item ${isOpen ? 'side-nav__item--active' : ''}`}
            title={`Vào Workspace ${group.name}`}
            aria-current={isOpen ? 'page' : undefined}
            onClick={onNavigate}
          >
            <span className="side-nav__icon-wrap">
              <GroupMark workspaceId={group.id} name={group.name} size={24} />
            </span>
            <span className="side-nav__label">{group.name}</span>
          </Link>
        );
      })}
      {hasMore && (
        <Link
          to="/workspaces"
          className="side-nav__item side-nav__item--more"
          title={`Xem tất cả ${totalCount} Workspace`}
          onClick={onNavigate}
        >
          <span className="side-nav__icon-wrap">
            <Icon name="more_horiz" size={19} rounded />
          </span>
          <span className="side-nav__label">Xem tất cả ({totalCount})</span>
        </Link>
      )}
    </section>
  );
}
