import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation } from '@tanstack/react-query';

import { Icon } from '../../components/icon';
import { authApi } from '../auth/api/auth-api';
import { useAuth } from '../auth/auth-context';
import { settingsApi } from './settings-api';
import type { ApiError } from '../../lib/api-client';
import './settings-page.css';

/** Tab definitions for account settings view. */
const TABS = [
  { id: 'profile', label: 'Hồ sơ cá nhân', icon: 'person' },
  { id: 'security', label: 'Bảo mật', icon: 'shield' },
  { id: 'preferences', label: 'Tùy chỉnh', icon: 'tune' },
] as const;

type TabId = (typeof TABS)[number]['id'] | 'danger';

/**
 * Renders the account settings page with horizontal tab navigation.
 * Layout mirrors the workspace detail page for visual consistency.
 */
function SettingsPage() {
  const [activeTab, setActiveTab] = useState<TabId>('profile');

  return (
    <main className="account-page">
      <AccountHeader />
      <TabBar activeTab={activeTab} onTabChange={setActiveTab} />
      <div className="account-page__content">
        <TabContent activeTab={activeTab} />
      </div>
    </main>
  );
}

export default SettingsPage;

/* ─── Header ─────────────────────────────────────────────── */

/** Renders account settings page header. */
function AccountHeader() {
  return (
    <header className="account-page__header">
      <h2 className="account-page__title">Cài đặt tài khoản</h2>
      <p className="account-page__subtitle">
        Quản lý thông tin cá nhân, bảo mật và các tùy chọn giao diện của bạn.
      </p>
    </header>
  );
}

/* ─── Tab Bar ────────────────────────────────────────────── */

/** Renders horizontal tab navigation matching workspace detail tabs. */
function TabBar({
  activeTab,
  onTabChange,
}: {
  readonly activeTab: TabId;
  readonly onTabChange: (tab: TabId) => void;
}) {
  return (
    <nav className="account-page__tabs" aria-label="Account settings tabs">
      {TABS.map((tab) => (
        <button
          key={tab.id}
          className={`account-page__tab ${activeTab === tab.id ? 'account-page__tab--active' : ''}`}
          type="button"
          onClick={() => onTabChange(tab.id)}
          aria-selected={activeTab === tab.id}
          role="tab"
        >
          <Icon name={tab.icon} size={18} />
          {tab.label}
        </button>
      ))}
      <button
        className={`account-page__tab account-page__tab--danger ${activeTab === 'danger' ? 'account-page__tab--active' : ''}`}
        type="button"
        onClick={() => onTabChange('danger')}
        aria-selected={activeTab === 'danger'}
        role="tab"
      >
        <Icon name="warning" size={18} />
        Vùng nguy hiểm
      </button>
    </nav>
  );
}

/* ─── Tab Content ────────────────────────────────────────── */

/** Renders the active tab's content panel. */
function TabContent({ activeTab }: { readonly activeTab: TabId }) {
  switch (activeTab) {
    case 'profile':
      return <ProfileSection />;
    case 'security':
      return <SecuritySection />;
    case 'preferences':
      return <PreferencesSection />;
    case 'danger':
      return <DangerSection />;
    default:
      return null;
  }
}

/* ─── Profile Section ────────────────────────────────────── */

/** Displays user profile info (email, system role). */
function ProfileSection() {
  const { data: userProfile, isLoading } = useQuery({
    queryKey: ['userProfile'],
    queryFn: authApi.getMe,
  });

  return (
    <div className="account-page__sections">
      <section className="account-section">
        <div className="account-section__header">
          <Icon name="person" size={24} className="account-section__icon" />
          <h3 className="account-section__title">Hồ sơ cá nhân</h3>
        </div>
        {isLoading ? (
          <p>Đang tải hồ sơ...</p>
        ) : (
          <div className="account-form">
            <div className="account-form__field">
              <label className="account-form__label" htmlFor="account-email">
                Email
              </label>
              <input
                id="account-email"
                type="email"
                className="account-form__input"
                value={userProfile?.email || ''}
                disabled
              />
              <span className="account-form__hint">
                Email liên kết với tài khoản tổ chức không thể thay đổi trực tiếp.
              </span>
            </div>
            <div className="account-form__field">
              <label className="account-form__label" htmlFor="account-role">
                Vai trò hệ thống
              </label>
              <input
                id="account-role"
                type="text"
                className="account-form__input"
                value={userProfile?.systemRole || 'USER'}
                disabled
              />
            </div>
          </div>
        )}
      </section>
    </div>
  );
}

/* ─── Security Section ───────────────────────────────────── */

/** Handles password change form and device session list. */
function SecuritySection() {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const changePasswordMutation = useMutation({
    mutationFn: settingsApi.changePassword,
    onSuccess: () => {
      setSuccessMsg('Mật khẩu đã được cập nhật thành công.');
      setErrorMsg(null);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    },
    onError: (error: ApiError) => {
      setErrorMsg(error.message || 'Cập nhật mật khẩu thất bại.');
      setSuccessMsg(null);
    },
  });

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    if (!currentPassword) {
      setErrorMsg('Mật khẩu hiện tại không được để trống.');
      return;
    }
    if (!newPassword) {
      setErrorMsg('Mật khẩu mới không được để trống.');
      return;
    }
    if (newPassword.length < 12 || newPassword.length > 128) {
      setErrorMsg('Mật khẩu mới phải từ 12 đến 128 ký tự.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setErrorMsg('Mật khẩu xác nhận không khớp.');
      return;
    }

    changePasswordMutation.mutate({ currentPassword, newPassword });
  };

  return (
    <div className="account-page__sections">
      {/* Password Change */}
      <section className="account-section">
        <div className="account-section__header">
          <Icon name="lock" size={24} className="account-section__icon" />
          <h3 className="account-section__title">Đổi mật khẩu</h3>
        </div>

        {errorMsg && (
          <div className="account-alert account-alert--error">
            <Icon name="error" size={20} />
            <span>{errorMsg}</span>
          </div>
        )}
        {successMsg && (
          <div className="account-alert account-alert--success">
            <Icon name="check_circle" size={20} />
            <span>{successMsg}</span>
          </div>
        )}

        <form className="account-form" onSubmit={handleSubmit}>
          <div className="account-form__field">
            <label className="account-form__label" htmlFor="current-password">
              Mật khẩu hiện tại
            </label>
            <input
              id="current-password"
              type="password"
              className="account-form__input"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              placeholder="Nhập mật khẩu hiện tại"
            />
          </div>
          <div className="account-form__row">
            <div className="account-form__field">
              <label className="account-form__label" htmlFor="new-password">
                Mật khẩu mới
              </label>
              <input
                id="new-password"
                type="password"
                className="account-form__input"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Mật khẩu từ 12-128 ký tự"
              />
            </div>
            <div className="account-form__field">
              <label className="account-form__label" htmlFor="confirm-password">
                Xác nhận mật khẩu mới
              </label>
              <input
                id="confirm-password"
                type="password"
                className="account-form__input"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Nhập lại mật khẩu mới"
              />
            </div>
          </div>
          <div className="account-form__actions">
            <button
              type="submit"
              className="account-btn--primary"
              disabled={changePasswordMutation.isPending}
            >
              <Icon name="save" size={16} />
              {changePasswordMutation.isPending ? 'Đang xử lý...' : 'Cập nhật mật khẩu'}
            </button>
          </div>
        </form>
      </section>

      {/* Device Sessions */}
      <section className="account-section">
        <div className="account-section__header">
          <Icon name="devices" size={24} className="account-section__icon" />
          <h3 className="account-section__title">Thiết bị &amp; Phiên đăng nhập</h3>
        </div>
        <div className="account-device-list">
          <div className="account-device-item account-device-item--active">
            <Icon name="laptop_mac" size={24} className="account-device-icon" />
            <div className="account-device-info">
              <h5 className="account-device-name">MacBook Pro - Chrome</h5>
              <p className="account-device-meta">
                Hà Nội, Việt Nam &bull; Đang hoạt động (Hiện tại)
              </p>
            </div>
          </div>
          <div className="account-device-item">
            <Icon name="smartphone" size={24} className="account-device-icon" />
            <div className="account-device-info">
              <h5 className="account-device-name">iPhone 13 - Safari</h5>
              <p className="account-device-meta">
                Hà Nội, Việt Nam &bull; Đăng nhập 2 giờ trước
              </p>
            </div>
            <button type="button" className="account-device-action">
              Đăng xuất
            </button>
          </div>
        </div>
        <button type="button" className="account-link--danger">
          <Icon name="logout" size={18} />
          Đăng xuất khỏi tất cả thiết bị khác
        </button>
      </section>
    </div>
  );
}

/* ─── Preferences Section ────────────────────────────────── */

/** Placeholder for user preferences (theme, language, etc.). */
function PreferencesSection() {
  return (
    <div className="account-page__sections">
      <section className="account-section">
        <div className="account-section__header">
          <Icon name="tune" size={24} className="account-section__icon" />
          <h3 className="account-section__title">Tùy chỉnh giao diện</h3>
        </div>
        <p style={{ font: 'var(--font-body-md)', color: 'var(--color-on-surface-variant)' }}>
          Tính năng tùy chỉnh giao diện đang được phát triển.
        </p>
      </section>
    </div>
  );
}

/* ─── Danger Section ─────────────────────────────────────── */

/** Logout and account danger zone actions. */
function DangerSection() {
  const navigate = useNavigate();
  const { clearToken } = useAuth();

  const handleLogout = async () => {
    try {
      await authApi.logout();
    } catch {
      // Ignore network errors on logout to guarantee client-side logout
    } finally {
      clearToken();
      navigate('/login');
    }
  };

  return (
    <div className="account-page__sections">
      <section className="account-logout-section">
        <h3 className="account-logout-section__title">Đăng xuất</h3>
        <p className="account-logout-section__description">
          Đăng xuất khỏi tài khoản trên thiết bị này. Bạn sẽ cần đăng nhập lại để tiếp tục sử dụng.
        </p>
        <div className="account-form__actions">
          <button
            type="button"
            className="account-btn--danger"
            onClick={handleLogout}
          >
            <Icon name="logout" size={18} />
            Đăng xuất
          </button>
        </div>
      </section>
    </div>
  );
}
