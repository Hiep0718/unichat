/**
 * "Nhóm của bạn" in the sidebar: every group, with the open one marked and its
 * assistant one step below it.
 *
 * The sidebar is the same inside a group as outside one, so a reader never
 * loses the way to the feed, messages or another group by opening a group.
 * The open group is found in the list rather than announced in a header, and
 * its assistant — the one group destination that is a tool rather than part
 * of the group's content, so not in the group's tab bar — hangs off it.
 */
import { Link, useLocation } from 'react-router-dom';

import { Icon } from './icon';
import { GroupMark } from '../features/workspaces/components/group-mark';

import type { SideNavGroup } from './side-nav-group-list';

interface SideNavGroupsProps {
  readonly groups: readonly SideNavGroup[];
  /** The group whose pages are open, or undefined outside a group. */
  readonly activeGroupId: string | undefined;
}

export function SideNavGroups({ groups, activeGroupId }: SideNavGroupsProps) {
  const location = useLocation();
  if (groups.length === 0) {
    return null;
  }
  return (
    <>
      <div className="side-nav__section-row">
        <p className="side-nav__section">Nhóm của bạn</p>
        <Link
          to="/workspaces?new=1"
          className="side-nav__section-add"
          title="Tạo nhóm mới"
          aria-label="Tạo nhóm mới"
        >
          <Icon name="add" size={16} rounded />
        </Link>
      </div>
      {groups.map((group) => {
        const isOpen = group.id === activeGroupId;
        const assistantHref = `/workspaces/${group.id}/chat`;
        return (
          <div key={group.id} className="side-nav__group">
            <Link
              to={`/workspaces/${group.id}`}
              className={`side-nav__item ${isOpen ? 'side-nav__item--active' : ''}`}
              title={`Vào nhóm ${group.name}`}
              aria-current={isOpen ? 'page' : undefined}
            >
              <GroupMark workspaceId={group.id} name={group.name} size={24} />
              <span className="side-nav__label">{group.name}</span>
            </Link>
            {isOpen && (
              <Link
                to={assistantHref}
                className={`side-nav__item side-nav__item--ai side-nav__item--sub ${
                  location.pathname.startsWith(assistantHref) ? 'side-nav__item--current' : ''
                }`}
                title={`Trợ lý AI của ${group.name}`}
              >
                <Icon name="auto_awesome" size={20} rounded />
                <span className="side-nav__label">Trợ lý AI</span>
              </Link>
            )}
          </div>
        );
      })}
    </>
  );
}
