/**
 * Chọn ảnh đại diện, hoặc một màu thay cho ảnh.
 *
 * Chữ cái là mặc định chứ không phải chỗ trống chờ thay: không ai phải tải gì
 * lên mới nhận ra được, và màu ở đây dành cho người muốn phân biệt được mà
 * không cần ảnh.
 *
 * Các ô màu lấy thẳng từ `AVATAR_COLOURS`, đúng bảng mà avatar dùng để vẽ.
 * Bản trước khai màu riêng trong CSS và ba trong sáu ô cùng là `var(--muc)`,
 * nên navy, teal, plum ra một ô đen giống hệt nhau và không ô nào mang màu
 * nó sẽ đặt.
 */
import { useRef, useState } from 'react';

import { Icon } from '../../../components/icon';
import { EntityAvatar } from '../../../components/entity-avatar';
import { AVATAR_COLOURS } from '../../../components/avatar-colours';
import { forgetAvatar } from '../../../components/avatar-image-cache';
import { authApi } from '../../auth/api/auth-api';

import type { AvatarColorKey } from '../../../components/avatar-colours';
import type { UserResponse } from '../../auth/api/auth-api';

import './avatar-picker.css';

/** Phải khớp tập màu máy chủ chấp nhận. */
const COLOURS: readonly AvatarColorKey[] = ['navy', 'teal', 'plum', 'moss', 'clay', 'slate'];

const LABELS: Record<AvatarColorKey, string> = {
  navy: 'Xanh navy',
  teal: 'Xanh ngọc',
  plum: 'Tím mận',
  moss: 'Xanh rêu',
  clay: 'Cam đất',
  slate: 'Xám đá',
};

interface AvatarPickerProps {
  readonly profile: UserResponse;
  /** Gọi sau mỗi thay đổi, để nơi gọi tải lại hồ sơ. */
  readonly onChanged: () => void;
}

export function AvatarPicker({ profile, onChanged }: AvatarPickerProps) {
  const fileInput = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /** Chạy một thay đổi, giữ ảnh trong bộ nhớ đệm và biểu mẫu khớp nhau. */
  const apply = async (change: () => Promise<void>) => {
    setBusy(true);
    setError(null);
    try {
      await change();
      // Thiếu dòng này thì ảnh cũ còn hiện cho tới khi tải lại cả trang.
      forgetAvatar(profile.id);
      onChanged();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Không lưu được thay đổi.');
    } finally {
      setBusy(false);
    }
  };

  const onFileChosen = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    // Xóa ô chọn tệp để chọn lại đúng tệp đó được sau một lần lỗi.
    event.target.value = '';
    if (file) void apply(() => authApi.uploadAvatar(file));
  };

  return (
    <div className="avatar-picker">
      <EntityAvatar
        name={profile.displayName}
        size={64}
        shape="circle"
        userId={profile.id}
        hasAvatar={profile.hasAvatar}
        avatarColor={profile.avatarColor}
      />

      <div className="avatar-picker__main">
        <div className="avatar-picker__row">
          <button
            type="button"
            className="avatar-picker__upload"
            onClick={() => fileInput.current?.click()}
            disabled={busy}
          >
            <Icon name="photo_camera" size={17} />
            {profile.hasAvatar ? 'Đổi ảnh' : 'Tải ảnh lên'}
          </button>

          {profile.hasAvatar && (
            <button
              type="button"
              className="avatar-picker__plain"
              onClick={() => void apply(authApi.removeAvatar)}
              disabled={busy}
            >
              Gỡ ảnh
            </button>
          )}

          <input
            ref={fileInput}
            type="file"
            accept="image/png,image/jpeg,image/webp"
            onChange={onFileChosen}
            className="avatar-picker__file"
            aria-label="Chọn ảnh đại diện"
          />

          <fieldset className="avatar-picker__colours" disabled={busy}>
            <legend className="avatar-picker__legend">hoặc chọn màu:</legend>
            {COLOURS.map((colour) => (
              <button
                key={colour}
                type="button"
                className={`avatar-picker__swatch${
                  profile.avatarColor === colour ? ' avatar-picker__swatch--on' : ''
                }`}
                // Màu nội tuyến vì nó là dữ liệu, không phải kiểu dáng: nguồn
                // duy nhất là bảng mà avatar vẽ ra, nên hai chỗ không thể lệch.
                style={{ background: AVATAR_COLOURS[colour].bg }}
                onClick={() => void apply(() => authApi.chooseAvatarColor(colour))}
                aria-pressed={profile.avatarColor === colour}
                aria-label={LABELS[colour]}
                title={LABELS[colour]}
              />
            ))}
            <button
              type="button"
              className="avatar-picker__plain"
              onClick={() => void apply(() => authApi.chooseAvatarColor(null))}
              disabled={profile.avatarColor === null}
            >
              Tự động
            </button>
          </fieldset>
        </div>

        <p
          className={`avatar-picker__hint${error ? ' avatar-picker__hint--bad' : ''}`}
          role={error ? 'alert' : undefined}
        >
          {error ?? 'PNG, JPEG hoặc WebP, tối đa 2 MiB. Ảnh sẽ được cắt vuông.'}
        </p>
      </div>
    </div>
  );
}
