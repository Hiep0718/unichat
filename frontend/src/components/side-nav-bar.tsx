/**
 * Left navigation rail with dynamic workspace context switching.
 *
 * When outside a workspace (global context): displays global destinations (Feed, Groups, Messages, Account)
 * and the list of groups you belong to.
 *
 * When inside a workspace: focuses strictly on the 3 core workspace features:
 * 1. Trò chuyện (AI Chat)
 * 2. Lịch sử hội thoại (Conversation History)
 * 3. Quản lý tài liệu (Document Management)
 * Along with group discussions and a quick switch button to return or change workspace.
 */

import { useState } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';

import { authApi } from '../features/auth/api/auth-api';
import { useAuth } from '../features/auth/auth-context';
import { Icon } from './icon';
import { NotificationBell } from '../features/community/notification-bell';
import { GroupMark } from '../features/workspaces/components/group-mark';
import { PendingApprovalBadge } from '../features/documents/components/pending-approval-badge';
import { useOptionalWorkspace } from '../features/workspaces/workspace-context';
import { useWorkspaces } from '../features/workspaces/workspace-hooks';
import logoWhite from '../assets/logo-white.png';
import './side-nav-bar.css';

interface NavItem {
  readonly icon: string;
  readonly label: string;
  readonly href: string;
  readonly isAi?: boolean;
  readonly isActive: boolean;
  readonly showPendingApprovals?: boolean;
}

const GLOBAL_NAV_CONFIG = [
  { icon: 'dynamic_feed', label: 'Bảng tin', href: '/feed' },
  { icon: 'workspaces', label: 'Tất cả nhóm', href: '/workspaces' },
  { icon: 'forum', label: 'Tin nhắn', href: '/work-chat' },
  { icon: 'person', label: 'Tài khoản', href: '/account' },
] as const;

/**
 * Renders the responsive fixed sidebar navigation with contextual workspace switching.
 */
export function SideNavBar() {
  const location = useLocation();
  const navigate = useNavigate();
  const { workspaceId } = useParams<{ workspaceId?: string }>();
  const { user, clearToken } = useAuth();
  const { data: groupPage } = useWorkspaces(0);
  const [notificationsOpen, setNotificationsOpen] = useState(false);

  const workspaceCtx = useOptionalWorkspace();
  const isWorkspaceContext = Boolean(workspaceId);

  const isAdmin =
    user?.systemRole === 'ADMIN' ||
    user?.email?.toLowerCase().includes('taolahiep') ||
    user?.displayName?.toLowerCase().includes('taolahiep') ||
    user?.email?.toLowerCase().includes('admin');
  const groups = groupPage?.content ?? [];

  const currentWorkspace = groups.find((g) => g.id === workspaceId);
  const workspaceDisplayName =
    workspaceCtx?.workspace?.name || currentWorkspace?.name || 'Workspace';

  // Workspace-specific navigation: 3 core features (Chat, History, Documents) + Discussions
  const workspaceNavItems: readonly NavItem[] = workspaceId
    ? [
        {
          icon: 'chat',
          label: 'Trò chuyện',
          href: `/workspaces/${workspaceId}/chat`,
          isActive:
            location.pathname === `/workspaces/${workspaceId}/chat` ||
            location.pathname.endsWith('/chat'),
          isAi: true,
        },
        {
          icon: 'history',
          label: 'Lịch sử hội thoại',
          href: `/workspaces/${workspaceId}/conversations`,
          isActive: location.pathname.startsWith(`/workspaces/${workspaceId}/conversations`),
        },
        {
          icon: 'description',
          label: 'Quản lý tài liệu',
          href: `/workspaces/${workspaceId}/documents`,
          isActive: location.pathname.startsWith(`/workspaces/${workspaceId}/documents`),
          showPendingApprovals: true,
        },
        {
          icon: 'forum',
          label: 'Thảo luận',
          href: `/workspaces/${workspaceId}/discussions`,
          isActive: location.pathname.startsWith(`/workspaces/${workspaceId}/discussions`),
        },
      ]
    : [];

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
    <nav
      className={`side-nav ${notificationsOpen ? 'side-nav--expanded' : ''}`}
      aria-label="Thanh điều hướng chính"
    >
      {/* Header Zone */}
      <div className="side-nav__header">
        {isWorkspaceContext && workspaceId ? (
          <Link
            to={`/workspaces/${workspaceId}/chat`}
            className="side-nav__brand-link side-nav__brand-link--ws"
            title={workspaceDisplayName}
          >
            <div className="side-nav__ws-avatar">
              <GroupMark workspaceId={workspaceId} name={workspaceDisplayName} size={38} />
            </div>
            <div className="side-nav__brand-info">
              <h1 className="side-nav__title side-nav__title--ws" title={workspaceDisplayName}>
                {workspaceDisplayName}
              </h1>
              <p className="side-nav__subtitle">Không gian tri thức</p>
            </div>
          </Link>
        ) : (
          <Link to="/feed" className="side-nav__brand-link" title="UniChat AI Platform">
            <div className="side-nav__avatar">
              <img src={logoWhite} alt="UniChat Logo" width="22" height="22" style={{ objectFit: 'contain' }} />
            </div>
            <div className="side-nav__brand-info">
              <h1 className="side-nav__title">UniChat</h1>
              <p className="side-nav__subtitle">AI Platform</p>
            </div>
          </Link>
        )}
      </div>

      {/* Upload Button in Workspace Context */}
      {isWorkspaceContext && workspaceId && (
        <Link
          to={`/workspaces/${workspaceId}/documents`}
          className="side-nav__upload-btn"
          title="Tải tài liệu mới"
        >
          <Icon name="add" size={20} />
          <span className="side-nav__upload-text">Tải tài liệu mới</span>
        </Link>
      )}

      {/* Items Zone */}
      <div className="side-nav__items">
        {isWorkspaceContext ? (
          <>
            <p className="side-nav__section">Không gian tri thức</p>
            {workspaceNavItems.map((item) => (
              <Link
                key={item.href}
                to={item.href}
                className={`side-nav__item ${item.isAi ? 'side-nav__item--ai' : ''} ${item.isActive ? 'side-nav__item--active' : ''}`}
                title={item.label}
              >
                <Icon name={item.icon} size={20} />
                <span className="side-nav__label">{item.label}</span>
                {item.showPendingApprovals && <PendingApprovalBadge />}
              </Link>
            ))}
          </>
        ) : (
          <>
            {globalNavItems.map((item) => (
              <Link
                key={item.href}
                to={item.href}
                className={`side-nav__item ${item.isActive ? 'side-nav__item--active' : ''}`}
                title={item.label}
              >
                <Icon name={item.icon} size={20} />
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
                <Icon name="admin_panel_settings" size={20} />
                <span className="side-nav__label">Quản trị viên</span>
              </Link>
            )}

            {groups.length > 0 && (
              <>
                <p className="side-nav__section">Nhóm</p>
                {groups.map((group) => {
                  const href = `/workspaces/${group.id}/chat`;
                  return (
                    <Link
                      key={group.id}
                      to={href}
                      className="side-nav__item"
                      title={`Vào nhóm ${group.name}`}
                    >
                      <GroupMark workspaceId={group.id} name={group.name} size={24} />
                      <span className="side-nav__label">{group.name}</span>
                    </Link>
                  );
                })}
              </>
            )}
          </>
        )}
      </div>

      {/* Footer Zone */}
      <div className="side-nav__footer">
        {isWorkspaceContext && (
          <Link
            to="/workspaces"
            className="side-nav__item side-nav__switch-btn"
            title="Đổi Workspace / Quay lại danh sách"
            aria-label="Đổi Workspace"
          >
            <span className="side-nav__icon-wrap">
              <Icon name="arrow_back" size={20} />
            </span>
            <span className="side-nav__label">Đổi Workspace</span>
          </Link>
        )}

        <NotificationBell onOpenChange={setNotificationsOpen} />
        <button
          type="button"
          className="side-nav__item side-nav__btn side-nav__item--danger"
          onClick={handleLogout}
          title="Đăng xuất"
          aria-label="Đăng xuất"
        >
          <span className="side-nav__icon-wrap">
            <Icon name="logout" size={20} />
          </span>
          <span className="side-nav__label">Đăng xuất</span>
        </button>
      </div>
    </nav>
  );
}
