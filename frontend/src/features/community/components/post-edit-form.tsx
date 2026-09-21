/**
 * In-place editor for a post's title and body.
 *
 * The label is intentionally absent: it is fixed at creation so an ordinary
 * discussion cannot be turned into an announcement after the fact.
 */
import { useState } from 'react';

import { Icon } from '../../../components/icon';
import './post-edit-form.css';

const MAX_TITLE = 200;

interface PostEditFormProps {
  readonly initialTitle: string;
  readonly initialBody: string;
  readonly saving: boolean;
  readonly error: string | null;
  readonly onCancel: () => void;
  readonly onSave: (values: { title: string; body: string }) => void;
}

export function PostEditForm({
  initialTitle,
  initialBody,
  saving,
  error,
  onCancel,
  onSave,
}: PostEditFormProps) {
  const [title, setTitle] = useState(initialTitle);
  const [body, setBody] = useState(initialBody);

  const canSave = title.trim().length > 0 && body.trim().length > 0 && !saving;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSave) return;
    onSave({ title: title.trim(), body: body.trim() });
  };

  return (
    <form className="post-edit" onSubmit={handleSubmit}>
      <label className="post-edit__label" htmlFor="post-edit-title">
        Tiêu đề
      </label>
      <input
        id="post-edit-title"
        className="post-edit__input"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        maxLength={MAX_TITLE}
        required
      />
      <span className="post-edit__count">
        {title.length}/{MAX_TITLE}
      </span>

      <label className="post-edit__label" htmlFor="post-edit-body">
        Nội dung
      </label>
      <textarea
        id="post-edit-body"
        className="post-edit__textarea"
        value={body}
        onChange={(e) => setBody(e.target.value)}
        required
      />

      {error && (
        <p className="post-edit__error" role="alert">
          <Icon name="error_outline" size={17} />
          {error}
        </p>
      )}

      <div className="post-edit__actions">
        <button type="button" className="post-edit__cancel" onClick={onCancel} disabled={saving}>
          Huỷ
        </button>
        <button type="submit" className="post-edit__save" disabled={!canSave}>
          {saving ? 'Đang lưu...' : 'Lưu thay đổi'}
        </button>
      </div>
    </form>
  );
}
