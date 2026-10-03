/**
 * The group's picture across the top of its own page, and the place its owner
 * changes it.
 *
 * The control lives here rather than on a settings tab because this is where
 * someone looks when they want to change how their group looks: they are
 * already staring at the picture they want to replace.
 */
import { useRef, useState } from 'react';

import { WorkspaceCover } from './workspace-cover';
import { forgetCover } from './workspace-cover-cache';
import { Icon } from '../../../components/icon';
import { removeWorkspaceCover, uploadWorkspaceCover } from '../workspace-api';
import './cover-banner.css';

interface CoverBannerProps {
  readonly workspaceId: string;
  readonly name: string;
  readonly hasCover: boolean;
  /** Owners and editors get the controls; everyone else sees the picture. */
  readonly canEdit: boolean;
  /** Called after a change lands, so the caller can refetch the group. */
  readonly onChanged: () => void;
}

/** Matches what the server accepts, so a wrong pick fails in the picker. */
const ACCEPTED = 'image/png,image/jpeg,image/webp';
const MAX_BYTES = 5 * 1024 * 1024;

export function CoverBanner({
  workspaceId,
  name,
  hasCover,
  canEdit,
  onChanged,
}: CoverBannerProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Bumped after a change so the preview remounts and refetches the blob.
  const [version, setVersion] = useState(0);

  const run = async (action: () => Promise<void>) => {
    setBusy(true);
    setError(null);
    try {
      await action();
      // The cache holds this group's old picture; drop it or the banner and
      // every card keep showing the previous one until a full reload.
      forgetCover(workspaceId);
      setVersion((v) => v + 1);
      onChanged();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Không đổi được ảnh bìa');
    } finally {
      setBusy(false);
    }
  };

  const handlePick = (file: File | undefined) => {
    if (!file) return;
    if (file.size > MAX_BYTES) {
      setError('Ảnh bìa vượt quá 5 MiB');
      return;
    }
    void run(() => uploadWorkspaceCover(workspaceId, file));
  };

  return (
    <div className="cover-banner">
      <div className="cover-banner__art" key={version}>
        <WorkspaceCover workspaceId={workspaceId} name={name} hasCover={hasCover} />
      </div>

      {canEdit && (
        <div className="cover-banner__tools">
          <input
            ref={inputRef}
            type="file"
            accept={ACCEPTED}
            className="cover-banner__input"
            onChange={(e) => {
              handlePick(e.target.files?.[0]);
              // Clearing lets the same file be picked again after an error.
              e.target.value = '';
            }}
          />
          <button
            type="button"
            className="cover-banner__btn"
            disabled={busy}
            onClick={() => inputRef.current?.click()}
          >
            <Icon name="photo_camera" size={16} />
            {busy ? 'Đang tải...' : hasCover ? 'Đổi ảnh bìa' : 'Thêm ảnh bìa'}
          </button>

          {hasCover && !busy && (
            <button
              type="button"
              className="cover-banner__btn cover-banner__btn--icon"
              onClick={() => void run(() => removeWorkspaceCover(workspaceId))}
              aria-label="Gỡ ảnh bìa"
              title="Gỡ ảnh bìa"
            >
              <Icon name="delete" size={16} />
            </button>
          )}
        </div>
      )}

      {error && (
        <p className="cover-banner__error" role="alert">
          <Icon name="error_outline" size={15} /> {error}
        </p>
      )}
    </div>
  );
}
