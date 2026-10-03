/**
 * Left navigation rail, laid out like Workplace: a few global destinations,
 * then the groups you belong to.
 *
 * The rail no longer swaps its contents when you enter a workspace — group
 * specific navigation lives in the group page's own tabs, so the rail stays a
 * stable way to move between groups.
 */

import { Link, useLocation, useParams } from 'react-router-dom';

import { useAuth } from '../features/auth/auth-context';
import { Icon } from './icon';
import { NotificationBell } from '../features/community/notification-bell';
import { GroupMark } from '../features/workspaces/components/group-mark';
import { PendingApprovalBadge } from '../features/documents/components/pending-approval-badge';
import { useWorkspaces } from '../features/workspaces/workspace-hooks';
import logoWhite from '../assets/logo-white.png';
import './side-nav-bar.css';

interface NavItem {
  readonly icon: string;
  readonly label: string;
  readonly href: string;
}

const GLOBAL_ITEMS: readonly NavItem[] = [
  { icon: 'dynamic_feed', label: 'Bảng tin', href: '/feed' },
  { icon: 'workspaces', label: 'Tất cả nhóm', href: '/workspaces' },
  { icon: 'chat', label: 'Tin nhắn', href: '/work-chat' },
  { icon: 'person', label: 'Tài khoản', href: '/account' },
];

/**
 * Renders the fixed left sidebar navigation.
 */
export function SideNavBar() {
  const location = useLocation();
  const { workspaceId } = useParams<{ workspaceId?: string }>();
  const { user } = useAuth();
  const { data: groupPage } = useWorkspaces(0);

  const isAdmin = user?.systemRole === 'ADMIN';
  const groups = groupPage?.content ?? [];

  return (
    <nav className="side-nav" aria-label="Thanh điều hướng chính">
      <div className="side-nav__header">
        <Link to="/feed" className="side-nav__brand-link" title="UniChat AI Platform">
          <div className="side-nav__avatar">
            <img src={logoWhite} alt="UniChat Logo" width="22" height="22" style={{ objectFit: 'contain' }} />
          </div>
          <div className="side-nav__brand-info">
            <h1 className="side-nav__title">UniChat</h1>
            <p className="side-nav__subtitle">AI Platform</p>
          </div>
        </Link>
      </div>

      <div className="side-nav__items">
        {GLOBAL_ITEMS.map((item) => (
          <Link
            key={item.href}
            to={item.href}
            className={`side-nav__item ${location.pathname === item.href ? 'side-nav__item--active' : ''}`}
            title={item.label}
          >
            <Icon name={item.icon} size={20} />
            <span className="side-nav__label">{item.label}</span>
          </Link>
        ))}

        {groups.length > 0 && (
          <>
            <p className="side-nav__section">Nhóm</p>
            {groups.map((group) => {
              const href = `/workspaces/${group.id}`;
              const isCurrent = workspaceId === group.id;
              return (
                <Link
                  key={group.id}
                  to={href}
                  className={`side-nav__item ${isCurrent ? 'side-nav__item--active' : ''}`}
                  title={group.name}
                >
                  <GroupMark workspaceId={group.id} name={group.name} size={24} />
                  <span className="side-nav__label">{group.name}</span>
                  {isCurrent && <PendingApprovalBadge />}
                </Link>
              );
            })}
          </>
        )}
      </div>

      <div className="side-nav__footer">
        <div className="side-nav__item" style={{ justifyContent: 'center' }}>
          <NotificationBell />
        </div>
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
