import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation } from '@tanstack/react-query';

import { SideNavBar } from '../../components/side-nav-bar';
import { Icon } from '../../components/icon';
import { authApi } from '../auth/api/auth-api';
import { useAuth } from '../auth/auth-context';
import { settingsApi } from './settings-api';
import type { ApiError } from '../../lib/api-client';
import './settings-page.css';

/**
 * Renders the settings page layout and contents.
 */
function SettingsPage() {
  const navigate = useNavigate();
  const { clearToken } = useAuth();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

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

  // Fetch the authenticated user's profile
  const { data: userProfile, isLoading: isProfileLoading } = useQuery({
    queryKey: ['userProfile'],
    queryFn: authApi.getMe,
  });

  // Mutation for updating the password
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

    // Validate inputs
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

    changePasswordMutation.mutate({
      currentPassword,
      newPassword,
    });
  };

  return (
    <div className="settings-layout">
      <SideNavBar />

      <main className="settings-main">
        <header className="settings-header">
          <h2 className="settings-header__title">Cài đặt tài khoản</h2>
          <p className="settings-header__subtitle">
            Quản lý thông tin cá nhân, bảo mật và các tùy chọn giao diện của bạn.
          </p>
        </header>

        <div className="settings-content">
          {/* Left Sidebar for Settings Navigation */}
          <aside className="settings-sidebar">
            <button className="settings-tab settings-tab--active" type="button">
              <Icon name="person" size={20} />
              Hồ sơ cá nhân
            </button>
            <button className="settings-tab" type="button">
              <Icon name="shield" size={20} />
              Bảo mật
            </button>
            <button className="settings-tab" type="button">
              <Icon name="tune" size={20} />
              Tùy chỉnh
            </button>
            <button className="settings-tab settings-tab--danger" type="button">
              <Icon name="warning" size={20} />
              Vùng nguy hiểm
            </button>
            <button className="settings-tab settings-tab--logout" type="button" onClick={handleLogout}>
              <Icon name="logout" size={20} />
              Đăng xuất
            </button>
          </aside>

          {/* Main Settings Panel */}
          <div className="settings-panel-group">
            
            {/* Section 1: Hồ sơ cá nhân */}
            <section className="settings-card">
              <header className="settings-card__header">
                <Icon name="person" size={24} className="settings-card__icon" />
                <h3 className="settings-card__title">Hồ sơ cá nhân</h3>
              </header>
              <div className="settings-card__content">
                {isProfileLoading ? (
                  <div>Đang tải hồ sơ...</div>
                ) : (
                  <>
                    <div className="settings-form-group">
                      <label className="settings-label" htmlFor="email">Email</label>
                      <input
                        id="email"
                        type="email"
                        className="settings-input"
                        value={userProfile?.email || ''}
                        disabled
                      />
                      <span className="settings-hint">
                        Email liên kết với tài khoản tổ chức không thể thay đổi trực tiếp.
                      </span>
                    </div>
                    <div className="settings-form-group">
                      <label className="settings-label" htmlFor="role">Vai trò hệ thống</label>
                      <input
                        id="role"
                        type="text"
                        className="settings-input"
                        value={userProfile?.systemRole || 'USER'}
                        disabled
                      />
                    </div>
                  </>
                )}
              </div>
            </section>

            {/* Section 2: Bảo mật */}
            <section className="settings-card">
              <header className="settings-card__header">
                <Icon name="shield" size={24} className="settings-card__icon" />
                <h3 className="settings-card__title">Bảo mật</h3>
              </header>
              <div className="settings-card__content">
                
                <h4 className="settings-section-title">Đổi mật khẩu</h4>
                
                {/* Alerts for feedback */}
                {errorMsg && (
                  <div className="settings-alert settings-alert--error">
                    <Icon name="error" size={20} />
                    <span>{errorMsg}</span>
                  </div>
                )}
                {successMsg && (
                  <div className="settings-alert settings-alert--success">
                    <Icon name="check_circle" size={20} />
                    <span>{successMsg}</span>
                  </div>
                )}

                <form onSubmit={handleSubmit}>
                  <div className="settings-form-group">
                    <label className="settings-label" htmlFor="current-password">Mật khẩu hiện tại</label>
                    <input
                      id="current-password"
                      type="password"
                      className="settings-input"
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      placeholder="Nhập mật khẩu hiện tại"
                    />
                  </div>
                  <div className="settings-form-row">
                    <div className="settings-form-group">
                      <label className="settings-label" htmlFor="new-password">Mật khẩu mới</label>
                      <input
                        id="new-password"
                        type="password"
                        className="settings-input"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        placeholder="Mật khẩu từ 12-128 ký tự"
                      />
                    </div>
                    <div className="settings-form-group">
                      <label className="settings-label" htmlFor="confirm-password">Xác nhận mật khẩu mới</label>
                      <input
                        id="confirm-password"
                        type="password"
                        className="settings-input"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder="Nhập lại mật khẩu mới"
                      />
                    </div>
                  </div>
                  <button 
                    type="submit" 
                    className="settings-btn-outline"
                    disabled={changePasswordMutation.isPending}
                  >
                    {changePasswordMutation.isPending ? 'Đang xử lý...' : 'Cập nhật mật khẩu'}
                  </button>
                </form>

                <hr className="settings-divider" />

                <h4 className="settings-section-title">Thiết bị & Phiên đăng nhập</h4>
                <div className="settings-device-list">
                  <div className="settings-device-item settings-device-item--active">
                    <Icon name="laptop_mac" size={24} className="settings-device-icon" />
                    <div className="settings-device-info">
                      <h5 className="settings-device-name">MacBook Pro - Chrome</h5>
                      <p className="settings-device-meta">
                        Hà Nội, Việt Nam &bull; Đang hoạt động (Hiện tại)
                      </p>
                    </div>
                  </div>
                  <div className="settings-device-item">
                    <Icon name="smartphone" size={24} className="settings-device-icon" />
                    <div className="settings-device-info">
                      <h5 className="settings-device-name">iPhone 13 - Safari</h5>
                      <p className="settings-device-meta">
                        Hà Nội, Việt Nam &bull; Đăng nhập 2 giờ trước
                      </p>
                    </div>
                    <button type="button" className="settings-device-action">
                      Đăng xuất
                    </button>
                  </div>
                </div>
                <button type="button" className="settings-link-danger">
                  <Icon name="logout" size={18} />
                  Đăng xuất khỏi tất cả thiết bị khác
                </button>

              </div>
            </section>
            
          </div>
        </div>
      </main>
    </div>
  );
}

export default SettingsPage;
