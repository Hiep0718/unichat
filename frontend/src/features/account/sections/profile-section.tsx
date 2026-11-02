import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { Icon } from '../../../components/icon';
import { authApi } from '../../auth/api/auth-api';
import { useAuth } from '../../auth/auth-context';
import { AvatarPicker } from '../components/avatar-picker';

/**
 * Khu vực "Hồ sơ": ảnh đại diện, tên hiển thị và email.
 *
 * Vai trò hệ thống đã bỏ khỏi đây. Nó là một ô chỉ-đọc mà người dùng không
 * đổi được và cũng không dùng vào việc gì ở trang này; thứ quyết định họ làm
 * được gì là quyền trên từng nhóm, không phải dòng chữ "USER".
 */
export function ProfileSection() {
  const queryClient = useQueryClient();
  const { setUser } = useAuth();
  const { data: profile, isLoading } = useQuery({
    queryKey: ['userProfile'],
    queryFn: authApi.getMe,
  });

  const [draft, setDraft] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  // null nghĩa là "chưa sửa", nên ô vẫn bám theo hồ sơ vừa tải về cho tới khi
  // người dùng thật sự gõ gì đó.
  const name = draft ?? profile?.displayName ?? '';
  const changed = profile != null && name.trim() !== profile.displayName;

  const rename = useMutation({
    mutationFn: (value: string) => authApi.updateProfile(value),
    onSuccess: (updated) => {
      setDraft(null);
      setSaved(true);
      queryClient.setQueryData(['userProfile'], updated);
      // Tên hiển thị khắp ứng dụng từ trạng thái đăng nhập, nên phải làm mới
      // ở đó chứ không chỉ trong biểu mẫu này.
      setUser({
        id: updated.id,
        email: updated.email,
        displayName: updated.displayName,
        systemRole: updated.systemRole,
        status: updated.status,
      });
    },
  });

  if (isLoading || !profile) {
    return (
      <section className="settings-card" aria-busy={isLoading}>
        <h2 className="settings-card__title">Hồ sơ</h2>
        <p className="settings-card__note">Đang tải hồ sơ…</p>
      </section>
    );
  }

  const handle = profile.email.split('@')[0] ?? '';

  return (
    <section className="settings-card">
      <h2 className="settings-card__title">Hồ sơ</h2>
      <p className="settings-card__note">
        Thông tin mọi người thấy ở bài viết, bình luận và tin nhắn.
      </p>

      <AvatarPicker
        profile={profile}
        onChanged={() => {
          void queryClient.invalidateQueries({ queryKey: ['userProfile'] });
        }}
      />

      <form
        className="settings-field"
        onSubmit={(event) => {
          event.preventDefault();
          if (changed && name.trim()) rename.mutate(name.trim());
        }}
      >
        <label className="settings-field__label" htmlFor="settings-name">
          Tên hiển thị
        </label>
        <div className="settings-field__row">
          <input
            id="settings-name"
            type="text"
            className="settings-field__input"
            value={name}
            maxLength={50}
            onChange={(event) => {
              setDraft(event.target.value);
              setSaved(false);
            }}
          />
          <button
            type="submit"
            className="settings-field__save"
            disabled={!changed || !name.trim() || rename.isPending}
          >
            {rename.isPending ? 'Đang lưu…' : 'Lưu'}
          </button>
        </div>
        <p
          className={`settings-field__hint${rename.isError ? ' settings-field__hint--bad' : ''}`}
          role={rename.isError ? 'alert' : undefined}
        >
          {rename.isError
            ? 'Không lưu được tên. Vui lòng thử lại.'
            : saved
              ? 'Đã lưu tên hiển thị.'
              : `Người khác vẫn nhắc bạn bằng @${handle}.`}
        </p>
      </form>

      <div className="settings-field">
        <label className="settings-field__label" htmlFor="settings-email">
          Email
        </label>
        <div className="settings-field__locked">
          <Icon name="lock" size={16} />
          <input id="settings-email" type="email" value={profile.email} readOnly />
        </div>
        <p className="settings-field__hint">
          Email gắn với tài khoản tổ chức nên không đổi trực tiếp được.
        </p>
      </div>
    </section>
  );
}
