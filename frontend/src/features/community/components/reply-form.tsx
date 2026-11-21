/**
 * Reusable reply form for discussions.
 *
 * Two shapes. `block` is the boxed editor with a "Bình luận" button, used at
 * the top of a post's own page where writing a long answer is the point.
 * `inline` is a single line that grows as it fills, used under a feed card and
 * for nested replies: a three-row box with a long placeholder and a disabled
 * button took a quarter of the card before anyone had written anything.
 */
import { useState } from 'react';

import { Icon } from '../../../components/icon';
import { MentionTextarea } from './mention-textarea';

import type { ReactNode } from 'react';

import '../discussion-page.css';
import './reply-form.css';

export interface ReplyFormProps {
  readonly loading: boolean;
  readonly onSubmit: (body: string) => void;
  readonly onCancel?: () => void;
  readonly autoFocus?: boolean;
  readonly placeholder?: string;
  /** Enables member suggestions when the writer types `@`. */
  readonly workspaceId?: string | null | undefined;
  readonly variant?: 'block' | 'inline';
  /** Drawn before the field in the inline shape: the writer's own face. */
  readonly avatar?: ReactNode;
}

const BLOCK_PLACEHOLDER = 'Viết bình luận... (@AI để hỏi trợ lý, @tên để nhắc thành viên)';
const INLINE_PLACEHOLDER = 'Viết bình luận…';

/**
 * Renders the reply field and its submit (and, when given, cancel) controls.
 */
export function ReplyForm({
  loading,
  onSubmit,
  onCancel,
  autoFocus,
  placeholder,
  workspaceId,
  variant = 'block',
  avatar,
}: ReplyFormProps) {
  const [replyInput, setReplyInput] = useState('');
  const empty = !replyInput.trim();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (empty) return;
    onSubmit(replyInput);
    setReplyInput('');
  };

  const field = (
    <MentionTextarea
      workspaceId={workspaceId}
      className="reply-form__input"
      value={replyInput}
      onChange={setReplyInput}
      placeholder={placeholder ?? (variant === 'inline' ? INLINE_PLACEHOLDER : BLOCK_PLACEHOLDER)}
      rows={variant === 'inline' ? 1 : 3}
      autoFocus={autoFocus}
    />
  );

  if (variant === 'inline') {
    return (
      <form
        className="reply-form reply-form--inline"
        onSubmit={handleSubmit}
        onKeyDown={(e) => {
          if (e.key === 'Escape' && onCancel) onCancel();
        }}
      >
        {avatar && <span className="reply-form__avatar">{avatar}</span>}
        <div className="reply-form__field">
          {field}
          {/* Shown only while writing: the instruction is for the person
              typing, not for everyone scrolling past an empty box. */}
          <p className="reply-form__hint">@AI để hỏi trợ lý · @tên để nhắc thành viên</p>
        </div>
        {onCancel && (
          <button type="button" className="reply-form__cancel-link" onClick={onCancel}>
            Hủy
          </button>
        )}
        <button
          type="submit"
          className="reply-form__send"
          disabled={loading || empty}
          aria-label={loading ? 'Đang gửi bình luận' : 'Gửi bình luận'}
        >
          <Icon name={loading ? 'progress_activity' : 'send'} size={18} />
        </button>
      </form>
    );
  }

  return (
    <form className="reply-form" onSubmit={handleSubmit}>
      {field}
      <div className="reply-form__footer">
        {onCancel && (
          <button type="button" className="reply-form__cancel" onClick={onCancel}>
            Hủy
          </button>
        )}
        <button type="submit" className="reply-form__submit" disabled={loading || empty}>
          {loading ? 'Đang gửi...' : 'Bình luận'}
        </button>
      </div>
    </form>
  );
}
