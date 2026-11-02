import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';

import { Icon } from '../../components/icon';
import { authApi } from '../auth/api/auth-api';
import { useAuth } from '../auth/auth-context';
import { ProfileBanner } from './components/profile-banner';
import { AppearanceSection } from './sections/appearance-section';
import { ProfileSection } from './sections/profile-section';
import { SecuritySection } from './sections/security-section';

import './settings-page.css';

/**
 * Các khu vực của trang cài đặt.
 *
 * Mỗi mục mở ra một khung riêng chứ không cuộn tới một mỏ neo trên cùng một
 * trang dài. Một cột điều hướng chỉ để nhảy tới chỗ đã hiển thị sẵn thì vừa
 * thừa vừa đẩy khu vực đầu tiên xuống dưới màn hình.
 */
const AREAS = [
  { id: 'profile', label: 'Hồ sơ', icon: 'person' },
  { id: 'security', label: 'Bảo mật', icon: 'shield' },
  { id: 'appearance', label: 'Giao diện', icon: 'contrast' },
] as const;

type AreaId = (typeof AREAS)[number]['id'];

/** Trang cài đặt tài khoản: dải hồ sơ, cột khu vực, và khung đang mở. */
function SettingsPage() {
  const [area, setArea] = useState<AreaId>('profile');
  const { data: profile } = useQuery({ queryKey: ['userProfile'], queryFn: authApi.getMe });

  return (
    <main className="settings">
      <header className="settings__head">
        <h1 className="settings__title">Cài đặt tài khoản</h1>
        <p className="settings__lede">Quản lý hồ sơ, bảo mật và giao diện của bạn.</p>
      </header>

      <ProfileBanner profile={profile} />

      <div className="settings__body">
        <aside className="settings__aside">
          <AreaNav area={area} onPick={setArea} />
          <SignOutCard />
        </aside>

        <div className="settings__panel">
          {area === 'profile' && <ProfileSection />}
          {area === 'security' && <SecuritySection />}
          {area === 'appearance' && <AppearanceSection />}
        </div>
      </div>
    </main>
  );
}

export default SettingsPage;

/** Cột chọn khu vực. */
function AreaNav({
  area,
  onPick,
}: {
  readonly area: AreaId;
  readonly onPick: (id: AreaId) => void;
}) {
  return (
    <nav className="settings__nav" aria-label="Khu vực cài đặt">
      {AREAS.map((item) => (
        <button
          key={item.id}
          type="button"
          className={`settings__nav-item${
            area === item.id ? ' settings__nav-item--on' : ''
          }`}
          aria-current={area === item.id ? 'page' : undefined}
          onClick={() => onPick(item.id)}
        >
          <Icon name={item.icon} size={18} />
          {item.label}
        </button>
      ))}
    </nav>
  );
}

/**
 * Đăng xuất, đặt dưới cột khu vực.
 *
 * Để ở đây vì nó thuộc về cả tài khoản chứ không riêng khu vực nào, và vì
 * cột này nếu chỉ mang ba mục thì phần còn lại là một khoảng trống cao.
 */
function SignOutCard() {
  const navigate = useNavigate();
  const { clearToken } = useAuth();

  const signOut = async () => {
    try {
      await authApi.logout();
    } catch {
      // Lỗi mạng không được giữ người dùng ở lại: phiên trên máy này phải
      // mất đi dù máy chủ có nhận được yêu cầu hay không.
    } finally {
      clearToken();
      navigate('/login');
    }
  };

  return (
    <section className="settings__signout">
      <h2 className="settings__signout-title">Đăng xuất</h2>
      <p className="settings__signout-note">
        Thoát khỏi tài khoản trên thiết bị này. Bạn sẽ cần đăng nhập lại.
      </p>
      <button type="button" className="settings__signout-btn" onClick={() => void signOut()}>
        <Icon name="logout" size={17} />
        Đăng xuất
      </button>
    </section>
  );
}
