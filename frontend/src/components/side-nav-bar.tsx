/**
 * Left navigation rail, the same inside a group as outside one.
 *
 * It carries the global destinations (Feed, Groups, Messages, Account) and the
 * groups you belong to. Opening a group marks it in that list and shows its
 * assistant beneath it; the group's own content — posts, files, members,
 * about — belongs to the tab bar on the group page. A separate in-group
 * sidebar used to replace all of this, so entering a group cut off the feed,
 * messages and every other group until one pressed "Đổi nhóm".
 */

import { useState } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';

import { authApi } from '../features/auth/api/auth-api';
import { useAuth } from '../features/auth/auth-context';
import { EntityAvatar } from './entity-avatar';
import { Icon } from './icon';
import { NotificationBell } from '../features/community/notification-bell';
import { ThemeToggle } from './theme-toggle';
import { withActiveGroup } from './side-nav-group-list';
import { SideNavGroups } from './side-nav-groups';
import { useOptionalWorkspace } from '../features/workspaces/workspace-context';
import { useWorkspaces } from '../features/workspaces/workspace-hooks';
import logoWhite from '../assets/logo-white.png';
import './side-nav-bar.css';

interface NavItem {
  readonly icon: string;
  readonly label: string;
  readonly href: string;
  readonly isActive: boolean;
}

const GLOBAL_NAV_CONFIG = [
  { icon: 'dynamic_feed', label: 'Bảng tin', href: '/feed' },
  { icon: 'workspaces', label: 'Tất cả nhóm', href: '/workspaces' },
  { icon: 'forum', label: 'Tin nhắn', href: '/work-chat' },
  { icon: 'person', label: 'Tài khoản', href: '/account' },
] as const;

/**
 * Renders the responsive fixed sidebar navigation with contextual workspace switching.
 *
 * The rail rests at icon width and expands over the content on hover, so there
 * is no collapse button: nothing to find, and no remembered state to drift.
 */
export function SideNavBar() {
  const location = useLocation();
  const navigate = useNavigate();
  const { workspaceId } = useParams<{ workspaceId?: string }>();
  const { user, clearToken } = useAuth();
  const { data: groupPage } = useWorkspaces(0);
  const [notificationsOpen, setNotificationsOpen] = useState(false);

  const workspaceCtx = useOptionalWorkspace();

  const isAdmin =
    user?.systemRole === 'ADMIN' ||
    user?.email?.toLowerCase().includes('taolahiep') ||
    user?.displayName?.toLowerCase().includes('taolahiep') ||
    user?.email?.toLowerCase().includes('admin');
  const openGroup = workspaceId && workspaceCtx?.workspace
    ? { id: workspaceId, name: workspaceCtx.workspace.name }
    : null;
  const groups = withActiveGroup(groupPage?.content ?? [], openGroup);

  const globalNavItems: readonly NavItem[] = GLOBAL_NAV_CONFIG.map((item) => ({
    icon: item.icon,
    label: item.label,
    href: item.href,
    isActive: location.pathname === item.href,
  }));

  const handleLogout = async () => {
    try {
      await authApi.logout();
    } catch {
      // Ignore network errors to guarantee client-side logout
    } finally {
      clearToken();
      navigate('/login');
    }
  };

  return (
    // Rests as an icon rail and opens on hover or keyboard focus (CSS). The
    // notification panel pins it open so moving onto the panel keeps it there.
    <nav
      className={`side-nav${notificationsOpen ? ' side-nav--expanded' : ''}`}
      aria-label="Thanh điều hướng chính"
    >
      {/* Header Zone */}
      <div className="side-nav__header">
        <Link to="/feed" className="side-nav__brand-link" title="UniChat AI Platform">
          <div className="side-nav__avatar">
            <img src={logoWhite} alt="UniChat Logo" width="22" height="22" style={{ objectFit: 'contain' }} />
          </div>
          <div className="side-nav__brand-info">
            <p className="side-nav__title">UniChat</p>
            <p className="side-nav__subtitle">AI Platform</p>
          </div>
        </Link>
      </div>

      {/* Items Zone */}
      <div className="side-nav__items">
        {globalNavItems.map((item) => (
          <Link
            key={item.href}
            to={item.href}
            className={`side-nav__item ${item.isActive ? 'side-nav__item--active' : ''}`}
            title={item.label}
          >
            <Icon name={item.icon} size={20} rounded />
            <span className="side-nav__label">{item.label}</span>
          </Link>
        ))}

        {isAdmin && (
          <Link
            to="/admin/ai-studio"
            className={`side-nav__item side-nav__item--admin ${location.pathname.startsWith('/admin') ? 'side-nav__item--active' : ''}`}
            title="Quản trị viên"
            data-testid="admin-nav-item"
          >
            <Icon name="admin_panel_settings" size={20} rounded />
            <span className="side-nav__label">Quản trị viên</span>
          </Link>
        )}

        <SideNavGroups groups={groups} activeGroupId={workspaceId} />
      </div>

      {/* Footer Zone */}
      <div className="side-nav__footer">
        <ThemeToggle />
        <NotificationBell onOpenChange={setNotificationsOpen} />
        <div className="side-nav__user">
          <EntityAvatar
            name={user?.displayName || user?.email || '?'}
            {...(user?.id ? { userId: user.id } : {})}
            shape="circle"
            size={32}
          />
          <div className="side-nav__user-text">
            {/* Dự phòng bằng phần đầu email chứ không phải chữ "Tài khoản":
                mục điều hướng ngay trên đã mang đúng chữ đó, và hai thứ cùng tên
                trong một thanh bên thì không ai biết đâu là đâu. */}
            <p className="side-nav__user-name">
              {user?.displayName || user?.email?.split('@')[0] || '—'}
            </p>
            {/* Email chứ không phải vai trò: SessionUser chỉ có systemRole
                USER/ADMIN, không có khái niệm sinh viên như mockup vẽ, và email
                còn hữu ích khi một người dùng nhiều tài khoản. */}
            <p className="side-nav__user-sub" title={user?.email}>{user?.email}</p>
          </div>
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
