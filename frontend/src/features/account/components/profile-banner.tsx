import { EntityAvatar } from '../../../components/entity-avatar';
import bannerArt from '../../../assets/greeting-band.jpg';

import type { UserResponse } from '../../auth/api/auth-api';

import './profile-banner.css';

/**
 * Dải hồ sơ ở đầu trang cài đặt.
 *
 * Dùng lại đúng bức ảnh của dải chào trên trang Workspace, nên hai nơi đọc ra
 * là một sản phẩm thay vì hai trang rời. Ảnh để ở độ mờ thấp và nằm dưới một
 * mảng tối đặc, nên mọi cặp chữ-trên-nền ở đây đo được chứ không đổi theo
 * từng điểm trên ảnh.
 */
export function ProfileBanner({ profile }: { readonly profile?: UserResponse | undefined }) {
  const handle = profile?.email.split('@')[0] ?? '';

  return (
    <section className="profile-banner" aria-label="Hồ sơ của bạn">
      <img className="profile-banner__art" src={bannerArt} alt="" aria-hidden="true" />

      <div className="profile-banner__who">
        <EntityAvatar
          name={profile?.displayName ?? ''}
          size={74}
          shape="circle"
          {...(profile ? { userId: profile.id, hasAvatar: profile.hasAvatar } : {})}
          {...(profile?.avatarColor ? { avatarColor: profile.avatarColor } : {})}
        />

        <div className="profile-banner__text">
          {/* Khi hồ sơ chưa về, hai dòng này vẫn giữ đúng chiều cao của chúng
              để dải không nảy lên khi dữ liệu tới. */}
          <p className="profile-banner__name">{profile?.displayName ?? ' '}</p>
          <p className="profile-banner__meta">
            {profile ? `@${handle} · ${profile.email}` : ' '}
          </p>
        </div>
      </div>
    </section>
  );
}
