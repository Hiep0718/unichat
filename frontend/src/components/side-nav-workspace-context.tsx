/**
 * Active workspace navigation block inside the sidebar.
 *
 * Surfaces the current group's identity, authoritative membership status, and
 * contextual destinations (Posts, Files, Members, AI Assistant for members,
 * Settings for owners/editors) so full-screen workspace pages like AI Chat or
 * Settings never strand the user without group navigation.
 */
import { Link, useLocation } from 'react-router-dom';

import { GroupMark } from '../features/workspaces/components/group-mark';
import { useJoinWorkspace } from '../features/workspaces/workspace-hooks';
import { Icon } from './icon';
import { isNavPathActive, workspaceRoleLabel } from './side-nav-group-list';

import type { WorkspaceDetails, WorkspaceRole } from '../features/workspaces/workspace-context';

interface SideNavWorkspaceContextProps {
  readonly workspace: WorkspaceDetails;
  readonly role: WorkspaceRole | null;
  readonly isMember: boolean;
  readonly canEdit: boolean;
  readonly onNavigate?: () => void;
}

interface WorkspaceNavLink {
  readonly icon: string;
  readonly label: string;
  readonly href: string;
  readonly isActive: boolean;
  readonly variant?: 'ai';
}

function buildWorkspaceLinks(
  workspaceId: string,
  pathname: string,
  isMember: boolean,
  canEdit: boolean,
): readonly WorkspaceNavLink[] {
  const base = `/workspaces/${workspaceId}`;
  const items: WorkspaceNavLink[] = [
    { icon: 'forum', label: 'Bài viết', href: `${base}/discussions`, isActive: isNavPathActive(pathname, `${base}/discussions`) },
    { icon: 'folder', label: 'Tệp tài liệu', href: `${base}/documents`, isActive: isNavPathActive(pathname, `${base}/documents`) },
    { icon: 'group', label: 'Thành viên', href: `${base}/members`, isActive: isNavPathActive(pathname, `${base}/members`) },
  ];
  if (isMember) {
    const aiActive = isNavPathActive(pathname, `${base}/chat`) || isNavPathActive(pathname, `${base}/conversations`);
    items.push({ icon: 'auto_awesome', label: 'Trợ lý AI', href: `${base}/chat`, isActive: aiActive, variant: 'ai' });
  }
  if (canEdit) {
    items.push({ icon: 'settings', label: 'Cài đặt Workspace', href: `${base}/settings`, isActive: isNavPathActive(pathname, `${base}/settings`) });
  }
  return items;
}

/** Renders the contextual navigation section for the currently open workspace. */
export function SideNavWorkspaceContext({
  workspace,
  role,
  isMember,
  canEdit,
  onNavigate,
}: SideNavWorkspaceContextProps) {
  const { pathname } = useLocation();
  const joinMutation = useJoinWorkspace();
  const aboutHref = `/workspaces/${workspace.id}/about`;
  const isAboutActive = pathname === `/workspaces/${workspace.id}` || isNavPathActive(pathname, aboutHref);
  const links = buildWorkspaceLinks(workspace.id, pathname, isMember, canEdit);

  return (
    <section className="side-nav__ws-section" aria-label={`Điều hướng Workspace ${workspace.name}`}>
      <div className="side-nav__section-row">
        <p className="side-nav__section">Workspace đang mở</p>
      </div>
      <Link
        to={aboutHref}
        className={`side-nav__item side-nav__ws-head ${isAboutActive ? 'side-nav__item--active' : ''}`}
        title={`${workspace.name} — ${workspaceRoleLabel(role)}`}
        aria-current="page"
        onClick={onNavigate}
      >
        <span className="side-nav__icon-wrap">
          <GroupMark workspaceId={workspace.id} name={workspace.name} size={24} />
        </span>
        <span className="side-nav__ws-meta">
          <span className="side-nav__ws-name">{workspace.name}</span>
          <span className="side-nav__ws-role">{workspaceRoleLabel(role)}</span>
        </span>
      </Link>
      <div className="side-nav__ws-nav">
        {links.map((item) => (
          <Link
            key={item.href}
            to={item.href}
            className={`side-nav__item side-nav__item--sub${item.variant === 'ai' ? ' side-nav__item--ai' : ''}${item.isActive ? ' side-nav__item--active' : ''}`}
            title={item.label}
            onClick={onNavigate}
          >
            <span className="side-nav__icon-wrap"><Icon name={item.icon} size={19} rounded /></span>
            <span className="side-nav__label">{item.label}</span>
          </Link>
        ))}
        {!isMember && (
          <button
            type="button"
            className="side-nav__item side-nav__btn side-nav__item--sub side-nav__item--join"
            disabled={joinMutation.isPending}
            onClick={() => joinMutation.mutate(workspace.id)}
            title="Tham gia Workspace để hỏi Trợ lý AI"
          >
            <span className="side-nav__icon-wrap"><Icon name="group_add" size={19} rounded /></span>
            <span className="side-nav__label">
              {joinMutation.isPending ? 'Đang tham gia...' : 'Tham gia Workspace'}
            </span>
          </button>
        )}
      </div>
    </section>
  );
}

