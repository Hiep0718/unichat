/**
 * Side navigation bar supporting both global and workspace-scoped routes (UI Spec §3).
 */

import { Link, useLocation, useParams } from 'react-router-dom';

import { useAuth } from '../features/auth/auth-context';
import { Icon } from './icon';
import { NotificationBell } from '../features/community/notification-bell';
import logoWhite from '../assets/logo-white.png';
import './side-nav-bar.css';

interface NavItem {
  readonly icon: string;
  readonly label: string;
  readonly href: string;
  readonly ownerOrEditorOnly?: boolean;
}

/**
 * Renders the fixed left sidebar navigation.
 */
export function SideNavBar() {
  const location = useLocation();
  const { workspaceId } = useParams<{ workspaceId?: string }>();
  const { user } = useAuth();

  const isAdmin = user?.systemRole === 'ADMIN';
  const isWorkspaceContext = Boolean(workspaceId);

  const workspaceNavItems: readonly NavItem[] = workspaceId
    ? [
        { icon: 'dashboard', label: 'Tổng quan', href: `/workspaces/${workspaceId}` },
        { icon: 'description', label: 'Tài liệu', href: `/workspaces/${workspaceId}/documents` },
        { icon: 'chat', label: 'Trò chuyện', href: `/workspaces/${workspaceId}/chat` },
        { icon: 'forum', label: 'Chat cộng đồng', href: `/workspaces/${workspaceId}/community-chat` },
        { icon: 'question_answer', label: 'Thảo luận', href: `/workspaces/${workspaceId}/discussions` },
        { icon: 'history', label: 'Lịch sử', href: `/workspaces/${workspaceId}/conversations` },
        { icon: 'analytics', label: 'Đánh giá', href: `/workspaces/${workspaceId}/evaluation`, ownerOrEditorOnly: true },
        { icon: 'settings', label: 'Cài đặt', href: `/workspaces/${workspaceId}/settings`, ownerOrEditorOnly: true },
      ]
    : [];

  const globalNavItems: readonly NavItem[] = [
    { icon: 'workspaces', label: 'Knowledge Spaces', href: '/workspaces' },
    { icon: 'person', label: 'Tài khoản', href: '/account' },
  ];

  const itemsToRender = isWorkspaceContext ? workspaceNavItems : globalNavItems;

  return (
    <nav className="side-nav" aria-label="Thanh điều hướng chính">
      <div className="side-nav__header">
        <Link to="/workspaces" className="side-nav__brand-link" title="UniChat AI Platform">
          <div className="side-nav__avatar">
            <img src={logoWhite} alt="UniChat Logo" width="22" height="22" style={{ objectFit: 'contain' }} />
          </div>
          <div className="side-nav__brand-info">
            <h1 className="side-nav__title">UniChat</h1>
            <p className="side-nav__subtitle">{isWorkspaceContext ? 'Workspace' : 'AI Platform'}</p>
          </div>
        </Link>
      </div>

      {isWorkspaceContext && (
        <Link
          to={`/workspaces/${workspaceId}/documents`}
          className="side-nav__upload-btn"
          title="Tải tài liệu mới"
        >
          <Icon name="add" size={20} />
          <span className="side-nav__upload-text">Tải tài liệu mới</span>
        </Link>
      )}

      <div className="side-nav__items">
        {itemsToRender.map((item) => {
          const isActive = location.pathname === item.href;
          return (
            <Link
              key={item.href}
              to={item.href}
              className={`side-nav__item ${isActive ? 'side-nav__item--active' : ''}`}
              title={item.label}
            >
              <Icon name={item.icon} size={20} />
              <span className="side-nav__label">{item.label}</span>
            </Link>
          );
        })}
      </div>

      <div className="side-nav__footer">
        {isWorkspaceContext && (
          <div className="side-nav__item" style={{ justifyContent: 'center' }}>
            <NotificationBell />
          </div>
        )}
        {isWorkspaceContext && (
          <Link to="/workspaces?select=true" className="side-nav__item" title="Đổi Workspace">
            <Icon name="arrow_back" size={20} />
            <span className="side-nav__label">Đổi Workspace</span>
          </Link>
        )}
        {isAdmin && (
          <Link
            to="/admin/users"
            className={`side-nav__item ${location.pathname.startsWith('/admin') ? 'side-nav__item--active' : ''}`}
            title="Quản trị viên"
          >
            <Icon name="admin_panel_settings" size={20} />
            <span className="side-nav__label">Quản trị viên</span>
          </Link>
        )}
      </div>
    </nav>
  );
}
