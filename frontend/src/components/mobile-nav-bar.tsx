/**
 * Compact bottom navigation bar and slide-over menu drawer for viewports below 768px.
 * Hidden on desktop where SideNavBar provides the persistent 68px overlay rail.
 */
import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';

import { authApi } from '../features/auth/api/auth-api';
import { useAuth } from '../features/auth/auth-context';
import { useOptionalWorkspace } from '../features/workspaces/workspace-context';
import { useWorkspaces } from '../features/workspaces/workspace-hooks';
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
import './mobile-nav-bar.css';

interface MobileDrawerProps {
  readonly onClose: () => void;
  readonly isAdmin: boolean;
  readonly onLogout: () => void;
}

function MobileDrawer({ onClose, isAdmin, onLogout }: MobileDrawerProps) {
  const { pathname } = useLocation();
  const { workspaceId } = useParams<{ workspaceId?: string }>();
  const { data: groupPage } = useWorkspaces(0);
  const workspaceCtx = useOptionalWorkspace();
  const activeWorkspace = workspaceId ? workspaceCtx?.workspace ?? null : null;

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

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onClose]);

  return (
    <div className="mobile-drawer-backdrop" onClick={onClose} role="presentation">
      <aside
        className="mobile-drawer"
        aria-label="Menu điều hướng di động"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="mobile-drawer__head">
          <span className="mobile-drawer__title">UniChat</span>
          <button type="button" className="mobile-drawer__close" onClick={onClose} aria-label="Đóng menu">
            <Icon name="close" size={20} rounded />
          </button>
        </div>

        <div className="mobile-drawer__scroll">
          {activeWorkspace && workspaceCtx && (
            <SideNavWorkspaceContext
              workspace={activeWorkspace}
              role={workspaceCtx.role}
              isMember={workspaceCtx.isMember}
              canEdit={workspaceCtx.canEdit}
              onNavigate={onClose}
            />
          )}
          <SideNavGroups
            groups={quickSwitchGroups}
            totalCount={groupPage?.totalElements}
            sectionTitle={activeWorkspace ? 'Chuyển Workspace' : 'Workspace của bạn'}
            onNavigate={onClose}
          />
        </div>

        <div className="mobile-drawer__footer">
          <Link
            to="/account"
            className={`side-nav__item${isNavPathActive(pathname, '/account') ? ' side-nav__item--active' : ''}`}
            onClick={onClose}
          >
            <span className="side-nav__icon-wrap"><Icon name="person" size={20} rounded /></span>
            <span className="side-nav__label">Tài khoản</span>
          </Link>
          {isAdmin && (
            <Link
              to="/admin/ai-studio"
              className={`side-nav__item side-nav__item--admin${isNavPathActive(pathname, '/admin') ? ' side-nav__item--active' : ''}`}
              onClick={onClose}
            >
              <span className="side-nav__icon-wrap"><Icon name="admin_panel_settings" size={20} rounded /></span>
              <span className="side-nav__label">Quản trị viên</span>
            </Link>
          )}
          <ThemeToggle />
          <button type="button" className="side-nav__item side-nav__btn" onClick={onLogout}>
            <span className="side-nav__icon-wrap"><Icon name="logout" size={20} rounded /></span>
            <span className="side-nav__label">Đăng xuất</span>
          </button>
        </div>
      </aside>
    </div>
  );
}

/** Renders the fixed mobile bottom dock and expandable drawer below 768px. */
export function MobileNavBar() {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const { workspaceId } = useParams<{ workspaceId?: string }>();
  const { user, clearToken } = useAuth();
  const workspaceCtx = useOptionalWorkspace();
  const [drawerOpen, setDrawerOpen] = useState(false);

  const aiHref = workspaceId && workspaceCtx?.isMember ? `/workspaces/${workspaceId}/chat` : '/chat';
  const aiActive = isNavPathActive(pathname, '/chat', true) || pathname.endsWith('/chat');

  const handleLogout = async () => {
    setDrawerOpen(false);
    try {
      await authApi.logout();
    } catch {
      // Clear local session regardless of network failure.
    } finally {
      clearToken();
      navigate('/login');
    }
  };

  return (
    <>
      <nav className="mobile-nav" aria-label="Điều hướng di động">
        <Link to="/feed" className={`mobile-nav__item${isNavPathActive(pathname, '/feed') ? ' mobile-nav__item--active' : ''}`}>
          <Icon name="dynamic_feed" size={21} rounded />
          <span>Bảng tin</span>
        </Link>
        <Link to="/workspaces" className={`mobile-nav__item${isNavPathActive(pathname, '/workspaces', true) ? ' mobile-nav__item--active' : ''}`}>
          <Icon name="workspaces" size={21} rounded />
          <span>Workspace</span>
        </Link>
        <Link to={aiHref} className={`mobile-nav__item mobile-nav__item--ai${aiActive ? ' mobile-nav__item--active' : ''}`}>
          <Icon name="auto_awesome" size={21} rounded />
          <span>Trợ lý AI</span>
        </Link>
        <Link to="/work-chat" className={`mobile-nav__item${isNavPathActive(pathname, '/work-chat') ? ' mobile-nav__item--active' : ''}`}>
          <Icon name="forum" size={21} rounded />
          <span>Tin nhắn</span>
        </Link>
        <button
          type="button"
          className={`mobile-nav__item${drawerOpen ? ' mobile-nav__item--active' : ''}`}
          onClick={() => setDrawerOpen(true)}
          aria-expanded={drawerOpen}
          aria-label="Mở menu Workspace và cài đặt"
        >
          <Icon name="menu" size={21} rounded />
          <span>Menu</span>
        </button>
      </nav>
      {drawerOpen && (
        <MobileDrawer
          onClose={() => setDrawerOpen(false)}
          isAdmin={isAuthoritativeAdmin(user)}
          onLogout={handleLogout}
        />
      )}
    </>
  );
}

