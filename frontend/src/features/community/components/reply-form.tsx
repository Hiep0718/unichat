/**
 * Reusable reply form for discussions.
 * Used in both PostDetailPage and DiscussionPage contexts.
 */
import { useState } from 'react';

import { MentionTextarea } from './mention-textarea';
import '../discussion-page.css';

export interface ReplyFormProps {
  readonly loading: boolean;
  readonly onSubmit: (body: string) => void;
  readonly onCancel?: () => void;
  readonly autoFocus?: boolean;
  readonly placeholder?: string;
  /** Enables member suggestions when the writer types `@`. */
  readonly workspaceId?: string | null | undefined;
}

/**
 * Renders a textarea + submit/cancel buttons for adding a reply.
 */
export function ReplyForm({
  loading,
  onSubmit,
  onCancel,
  autoFocus,
  placeholder = 'Viết bình luận... (@AI để hỏi trợ lý, @tên để nhắc thành viên)',
  workspaceId,
}: ReplyFormProps) {
  const [replyInput, setReplyInput] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!replyInput.trim()) return;
    onSubmit(replyInput);
    setReplyInput('');
  };

  return (
    <form className="reply-form" onSubmit={handleSubmit}>
      <MentionTextarea
        workspaceId={workspaceId}
        className="reply-form__input"
        value={replyInput}
        onChange={setReplyInput}
        placeholder={placeholder}
        rows={3}
        autoFocus={autoFocus}
      />
      <div className="reply-form__footer">
        {onCancel && (
          <button type="button" className="reply-form__cancel" onClick={onCancel}>
            Hủy
          </button>
        )}
        <button
          type="submit"
          className="reply-form__submit"
          disabled={loading || !replyInput.trim()}
        >
          {loading ? 'Đang gửi...' : 'Bình luận'}
        </button>
      </div>
    </form>
  );
}
