/**
 * Choosing a profile picture, or a colour to stand in for one.
 *
 * The letter avatar is the default rather than a placeholder to be replaced:
 * nobody has to upload anything to be recognisable, and the colour is there for
 * members who want to be distinguishable without a photo.
 */
import { useRef, useState } from 'react';

import { Icon } from '../../../components/icon';
import { EntityAvatar } from '../../../components/entity-avatar';
import { forgetAvatar } from '../../../components/avatar-image-cache';
import { authApi } from '../../auth/api/auth-api';
import type { AvatarColorKey } from '../../../components/entity-avatar';
import type { UserResponse } from '../../auth/api/auth-api';
import './avatar-picker.css';

/** Must match the set the server accepts. */
const COLOURS: readonly AvatarColorKey[] = ['navy', 'teal', 'plum', 'moss', 'clay', 'slate'];

const COLOUR_LABELS: Record<AvatarColorKey, string> = {
  navy: 'Xanh navy',
  teal: 'Xanh ngọc',
  plum: 'Tím mận',
  moss: 'Xanh rêu',
  clay: 'Cam đất',
  slate: 'Xám đá',
};

interface AvatarPickerProps {
  readonly profile: UserResponse;
  /** Called after any change, so the caller can refetch the profile. */
  readonly onChanged: () => void;
}

export function AvatarPicker({ profile, onChanged }: AvatarPickerProps) {
  const fileInput = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /** Runs one change, keeping the cached picture and the form in step. */
  const apply = async (change: () => Promise<void>) => {
    setBusy(true);
    setError(null);
    try {
      await change();
      // Without this the replaced picture keeps showing until a full reload.
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
    // Clearing the input lets the same file be picked again after a failure.
    event.target.value = '';
    if (file) {
      void apply(() => authApi.uploadAvatar(file));
    }
  };

  return (
    <div className="avatar-picker">
      <div className="avatar-picker__preview">
        <EntityAvatar
          name={profile.displayName}
          size={76}
          shape="circle"
          userId={profile.id}
          hasAvatar={profile.hasAvatar}
          avatarColor={profile.avatarColor}
        />
      </div>

      <div className="avatar-picker__controls">
        <div className="avatar-picker__buttons">
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
              className="avatar-picker__remove"
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
        </div>

        <fieldset className="avatar-picker__colours" disabled={busy}>
          <legend className="avatar-picker__legend">
            Màu chữ cái {profile.hasAvatar && '(dùng khi chưa có ảnh)'}
          </legend>
          <div className="avatar-picker__swatches">
            {COLOURS.map((colour) => (
              <button
                key={colour}
                type="button"
                className={`avatar-picker__swatch avatar-picker__swatch--${colour} ${
                  profile.avatarColor === colour ? 'avatar-picker__swatch--on' : ''
                }`}
                onClick={() => void apply(() => authApi.chooseAvatarColor(colour))}
                aria-pressed={profile.avatarColor === colour}
                aria-label={COLOUR_LABELS[colour]}
                title={COLOUR_LABELS[colour]}
              />
            ))}
            <button
              type="button"
              className="avatar-picker__auto"
              onClick={() => void apply(() => authApi.chooseAvatarColor(null))}
              disabled={profile.avatarColor === null}
            >
              Tự động
            </button>
          </div>
        </fieldset>

        <p className="avatar-picker__hint">
          {error ?? 'PNG, JPEG hoặc WebP, tối đa 2 MiB. Ảnh sẽ được cắt vuông.'}
        </p>
      </div>
    </div>
  );
}
