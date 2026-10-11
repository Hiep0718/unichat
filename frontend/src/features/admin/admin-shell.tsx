import { Link, NavLink, Outlet, useLocation } from 'react-router-dom';
import { Icon } from '../../components/icon';
import { useAuth } from '../auth/auth-context';
import './admin-shell.css';

interface AdminTab {
  readonly path: string;
  readonly label: string;
  readonly icon: string;
  readonly isPulse?: boolean;
}

const ADMIN_TABS: readonly AdminTab[] = [
  { path: '/admin/ai-studio', label: 'Giám sát Gemini API', icon: 'monitoring', isPulse: true },
  { path: '/admin/users', label: 'Người dùng & Phân quyền', icon: 'manage_accounts' },
  { path: '/admin/metrics', label: 'Số liệu đăng nhập & Chat AI', icon: 'analytics' },
  { path: '/admin/audit-logs', label: 'Nhật ký Kiểm toán', icon: 'security' },
];

/**
 * Top-level Admin Layout Shell unifying all admin views with Academic Precision.
 */
export function AdminShell() {
  const location = useLocation();
  const { user } = useAuth();

  return (
    <div className="admin-shell">
      <header className="admin-shell__header">
        <div className="admin-shell__topbar">
          <div className="admin-shell__brand">
            <span className="admin-shell__badge">
              <Icon name="verified_user" size={16} />
              Quản trị viên
            </span>
            <h1 className="admin-shell__title">UniChat Admin Portal</h1>
          </div>

          <div className="admin-shell__actions">
            <span style={{ fontSize: '0.875rem', color: '#64748b' }}>
              {user?.displayName?.trim() || user?.email || 'admin@unichat'}
            </span>
            <Link to="/feed" className="admin-shell__btn-exit" title="Quay về giao diện người dùng">
              <Icon name="arrow_back" size={18} />
              <span>Về ứng dụng</span>
            </Link>
          </div>
        </div>

        <nav className="admin-shell__tabs-bar" aria-label="Điều hướng quản trị">
          {ADMIN_TABS.map((tab) => {
            const isActive = location.pathname.startsWith(tab.path);
            return (
              <NavLink
                key={tab.path}
                to={tab.path}
                className={`admin-shell__tab ${isActive ? 'admin-shell__tab--active' : ''}`}
              >
                <Icon name={tab.icon} size={18} />
                <span>{tab.label}</span>
              </NavLink>
            );
          })}
        </nav>
      </header>

      <main className="admin-shell__content">
        <Outlet />
      </main>
    </div>
  );
}

export default AdminShell;
