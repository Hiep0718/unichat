/**
 * Left navigation rail with dynamic workspace context switching.
 *
 * When outside a workspace (global context): displays global destinations (Feed, Groups, Messages, Account)
 * and the list of groups you belong to.
 *
 * When inside a workspace it carries one destination and the way out. The
 * group's own content — posts, files, members, about — belongs to the tab bar
 * on the group page, and listing it here as well gave three of those places
 * two names each: "Quản lý tài liệu" beside a tab called "Tệp", "Thảo luận"
 * beside "Bài viết". Two names for one place is two places to a reader.
 */

import { useState } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';

import { authApi } from '../features/auth/api/auth-api';
import { useAuth } from '../features/auth/auth-context';
import { EntityAvatar } from './entity-avatar';
import { readRailCollapsed, writeRailCollapsed } from '../lib/rail-state';
import { Icon } from './icon';
import { NotificationBell } from '../features/community/notification-bell';
import { ThemeToggle } from './theme-toggle';
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
  const [collapsed, setCollapsed] = useState(() => readRailCollapsed());

  const toggleRail = () => {
    const next = !collapsed;
    setCollapsed(next);
    writeRailCollapsed(next);
  };
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

  // The assistant alone. It is the one workspace destination that is a tool
  // rather than a part of the group's content, so it is the one that does not
  // belong in the group's tab bar — and it keeps the name the group page uses
  // for it rather than the "Trò chuyện" it used to carry here, which read as
  // a third messaging feature beside Tin nhắn.
  const workspaceNavItems: readonly NavItem[] = workspaceId
    ? [
        {
          icon: 'auto_awesome',
          label: 'Trợ lý AI',
          href: `/workspaces/${workspaceId}/chat`,
          isActive:
            location.pathname === `/workspaces/${workspaceId}/chat` ||
            location.pathname.endsWith('/chat'),
          isAi: true,
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
      className={`side-nav${collapsed ? ' side-nav--collapsed' : ''}${
        notificationsOpen ? ' side-nav--expanded' : ''
      }`}
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
              <p className="side-nav__title side-nav__title--ws" title={workspaceDisplayName}>
                {workspaceDisplayName}
              </p>
              <p className="side-nav__subtitle">Không gian tri thức</p>
            </div>
          </Link>
        ) : (
          <Link to="/feed" className="side-nav__brand-link" title="UniChat AI Platform">
            <div className="side-nav__avatar">
              <img src={logoWhite} alt="UniChat Logo" width="22" height="22" style={{ objectFit: 'contain' }} />
            </div>
            <div className="side-nav__brand-info">
              <p className="side-nav__title">UniChat</p>
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
          <Icon name="add" size={20} rounded />
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
                <Icon name={item.icon} size={20} rounded />
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

            {groups.length > 0 && (
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
              <Icon name="arrow_back" size={20} rounded />
            </span>
            <span className="side-nav__label">Đổi Workspace</span>
          </Link>
        )}

        {/* Một mục có nhãn chữ, không phải một chấm tròn ở mép.

            Bản trước là một nút 22px nằm vắt ngang đường biên thanh bên:
            người dùng lần đầu không có cách nào đoán ra bấm vào đó thì điều
            gì xảy ra. Đứng cùng hàng với "Nền tối" và "Thông báo", nó đọc
            ra là một việc làm được, và nhãn chữ nói thẳng nó là việc gì. */}
        <button
          type="button"
          className="side-nav__item side-nav__btn"
          onClick={toggleRail}
          title={collapsed ? 'Mở rộng thanh bên' : 'Thu gọn thanh bên'}
          aria-label={collapsed ? 'Mở rộng thanh bên' : 'Thu gọn thanh bên'}
          aria-expanded={!collapsed}
        >
          <span className="side-nav__icon-wrap">
            <Icon name={collapsed ? 'right_panel_open' : 'left_panel_close'} size={20} rounded />
          </span>
          <span className="side-nav__label">Thu gọn</span>
        </button>
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
