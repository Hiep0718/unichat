/**
 * Desktop left navigation rail (68px resting, 248px elevated overlay on hover/focus).
 *
 * Layout hierarchy:
 *  1. Fixed brand header
 *  2. Fixed global primary destinations (Feed, AI Assistant, All Groups, Messages, Account, Admin)
 *  3. Independent scrollable zone: active group context (inside a workspace) + joined groups
 *  4. Fixed footer utilities (Theme, Notifications, User profile & Logout)
 */
import { useState } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';

import { authApi } from '../features/auth/api/auth-api';
import { useAuth } from '../features/auth/auth-context';
import { NotificationBell } from '../features/community/notification-bell';
import { useOptionalWorkspace } from '../features/workspaces/workspace-context';
import { useWorkspaces } from '../features/workspaces/workspace-hooks';
import logoWhite from '../assets/logo-white.png';
import { EntityAvatar } from './entity-avatar';
import { Icon } from './icon';
import {
  isAuthoritativeAdmin,
  isNavPathActive,
  otherJoinedGroups,
  withActiveGroup,
} from './side-nav-group-list';
import { SideNavGroups } from './side-nav-groups';
import { SideNavWorkspaceContext } from './side-nav-workspace-context';
import { ThemeToggle } from './theme-toggle';
import './side-nav-bar.css';

interface PrimaryNavConfig {
  readonly icon: string;
  readonly label: string;
  readonly href: string;
  readonly exact?: boolean;
  readonly variant?: 'ai';
}

const PRIMARY_NAV_CONFIG: readonly PrimaryNavConfig[] = [
  { icon: 'dynamic_feed', label: 'Bảng tin', href: '/feed' },
  { icon: 'auto_awesome', label: 'Trợ lý AI', href: '/chat', exact: true, variant: 'ai' },
  { icon: 'workspaces', label: 'Workspace', href: '/workspaces', exact: true },
  { icon: 'forum', label: 'Tin nhắn', href: '/work-chat' },
];

/** Renders the fixed desktop overlay sidebar navigation. */
export function SideNavBar() {
  const location = useLocation();
  const navigate = useNavigate();
  const { workspaceId } = useParams<{ workspaceId?: string }>();
  const { user, clearToken } = useAuth();
  const { data: groupPage } = useWorkspaces(0);
  const [notificationsOpen, setNotificationsOpen] = useState(false);

  const workspaceCtx = useOptionalWorkspace();
  const activeWorkspace = workspaceId ? workspaceCtx?.workspace ?? null : null;
  const isAdmin = isAuthoritativeAdmin(user);

  const openMemberGroup = activeWorkspace && workspaceCtx?.isMember
    ? { id: activeWorkspace.id, name: activeWorkspace.name }
    : null;
  const joinedGroups = withActiveGroup(
    groupPage?.content ?? [],
    openMemberGroup,
    Boolean(workspaceCtx?.isMember),
  );
  const quickSwitchGroups = activeWorkspace
    ? otherJoinedGroups(joinedGroups, activeWorkspace.id)
    : joinedGroups;
  const quickSwitchTotal = activeWorkspace && workspaceCtx?.isMember && groupPage?.totalElements !== undefined
    ? Math.max(0, groupPage.totalElements - 1)
    : groupPage?.totalElements;

  const handleLogout = async () => {
    try {
      await authApi.logout();
    } catch {
      // Ignore network errors so client session always clears cleanly.
    } finally {
      clearToken();
      navigate('/login');
    }
  };

  return (
    <nav
      className={`side-nav${notificationsOpen ? ' side-nav--expanded' : ''}`}
      aria-label="Thanh điều hướng chính"
    >
      <div className="side-nav__header">
        <Link to="/feed" className="side-nav__brand-link" title="UniChat AI Platform">
          <div className="side-nav__avatar">
            <img src={logoWhite} alt="UniChat Logo" width="22" height="22" className="side-nav__logo-img" />
          </div>
          <div className="side-nav__brand-info">
            <p className="side-nav__title">UniChat</p>
            <p className="side-nav__subtitle">AI Platform</p>
          </div>
        </Link>
      </div>

      <div className="side-nav__primary" aria-label="Điều hướng toàn cục">
        {PRIMARY_NAV_CONFIG.map((item) => {
          const active = isNavPathActive(location.pathname, item.href, item.exact);
          return (
            <Link
              key={item.href}
              to={item.href}
              className={`side-nav__item${item.variant === 'ai' ? ' side-nav__item--ai' : ''}${active ? ' side-nav__item--active' : ''}`}
              title={item.label}
              aria-current={active ? 'page' : undefined}
            >
              <span className="side-nav__icon-wrap">
                <Icon name={item.icon} size={20} rounded />
              </span>
              <span className="side-nav__label">{item.label}</span>
            </Link>
          );
        })}

        {isAdmin && (
          <Link
            to="/admin/ai-studio"
            className={`side-nav__item side-nav__item--admin${isNavPathActive(location.pathname, '/admin') ? ' side-nav__item--active' : ''}`}
            title="Quản trị viên"
            data-testid="admin-nav-item"
          >
            <span className="side-nav__icon-wrap">
              <Icon name="admin_panel_settings" size={20} rounded />
            </span>
            <span className="side-nav__label">Quản trị viên</span>
          </Link>
        )}
      </div>

      <div className="side-nav__divider" aria-hidden="true" />

      <div className="side-nav__scroll">
        {activeWorkspace && workspaceCtx && (
          <SideNavWorkspaceContext
            workspace={activeWorkspace}
            role={workspaceCtx.role}
            isMember={workspaceCtx.isMember}
            canEdit={workspaceCtx.canEdit}
          />
        )}
        <SideNavGroups
          groups={quickSwitchGroups}
          totalCount={quickSwitchTotal}
          sectionTitle={activeWorkspace ? 'Chuyển Workspace' : 'Workspace của bạn'}
          activeGroupId={activeWorkspace ? undefined : workspaceId}
        />
      </div>

      <div className="side-nav__footer">
        <ThemeToggle />
        <NotificationBell onOpenChange={setNotificationsOpen} />
        <div className={`side-nav__user${isNavPathActive(location.pathname, '/account') ? ' side-nav__user--active' : ''}`}>
          <Link
            to="/account"
            className="side-nav__user-link"
            title="Tài khoản"
            aria-label={`Tài khoản — ${user?.displayName || user?.email?.split('@')[0] || 'Cá nhân'}`}
            aria-current={isNavPathActive(location.pathname, '/account') ? 'page' : undefined}
          >
            <EntityAvatar
              name={user?.displayName || user?.email || '?'}
              {...(user?.id ? { userId: user.id } : {})}
              shape="circle"
              size={32}
            />
            <div className="side-nav__user-text">
              <p className="side-nav__user-name">
                {user?.displayName || user?.email?.split('@')[0] || '—'}
              </p>
              <p className="side-nav__user-sub" title={user?.email}>{user?.email}</p>
            </div>
          </Link>
          <button
            type="button"
            className="side-nav__user-out"
            onClick={handleLogout}
            title="Đăng xuất"
            aria-label="Đăng xuất"
          >
            <Icon name="logout" size={18} rounded />
          </button>
        </div>
      </div>
    </nav>
  );
}
