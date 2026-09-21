/**
 * Edit and delete actions on a post, shown to whoever is allowed to use them.
 *
 * Editing happens in place: the post turns into a form rather than opening a
 * modal, so the author keeps sight of what they wrote.
 */
import { useState } from 'react';

import { Icon } from '../../../components/icon';
import './post-owner-menu.css';

interface PostOwnerMenuProps {
  /** Author-only actions; a moderator sees delete without edit. */
  readonly canEdit: boolean;
  readonly canDelete: boolean;
  readonly onEdit: () => void;
  readonly onDelete: () => void;
}

export function PostOwnerMenu({ canEdit, canDelete, onEdit, onDelete }: PostOwnerMenuProps) {
  const [open, setOpen] = useState(false);
  const [confirming, setConfirming] = useState(false);

  if (!canEdit && !canDelete) return null;

  return (
    <div className="post-menu">
      <button
        type="button"
        className="post-menu__trigger"
        onClick={() => setOpen((value) => !value)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label="Tuỳ chọn bài viết"
      >
        <Icon name="more_horiz" size={20} />
      </button>

      {open && (
        <>
          <div
            className="post-menu__backdrop"
            onClick={() => {
              setOpen(false);
              setConfirming(false);
            }}
          />
          <div className="post-menu__list" role="menu">
            {canEdit && (
              <button
                type="button"
                role="menuitem"
                onClick={() => {
                  setOpen(false);
                  onEdit();
                }}
              >
                <Icon name="edit" size={17} />
                Chỉnh sửa
              </button>
            )}

            {canDelete && !confirming && (
              <button
                type="button"
                role="menuitem"
                className="post-menu__danger"
                onClick={() => setConfirming(true)}
              >
                <Icon name="delete" size={17} />
                Xoá bài viết
              </button>
            )}

            {canDelete && confirming && (
              <div className="post-menu__confirm">
                <p>Xoá bài viết này? Bình luận cũng sẽ không còn hiển thị.</p>
                <div className="post-menu__confirm-actions">
                  <button type="button" onClick={() => setConfirming(false)}>
                    Huỷ
                  </button>
                  <button
                    type="button"
                    className="post-menu__danger"
                    onClick={() => {
                      setOpen(false);
                      setConfirming(false);
                      onDelete();
                    }}
                  >
                    Xoá
                  </button>
                </div>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
