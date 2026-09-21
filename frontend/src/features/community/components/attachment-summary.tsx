/**
 * The assistant's summary of a document attached to a post.
 *
 * A long PDF asks every reader to open it before they know whether it is worth
 * opening. This answers that in place — and when no summary is coming, says so
 * rather than leaving an empty space that looks like a loading bug.
 */
import { useState } from 'react';

import { Icon } from '../../../components/icon';
import type { PostAttachment } from '../community-api';
import './attachment-summary.css';

interface AttachmentSummaryProps {
  readonly attachment: PostAttachment;
}

export function AttachmentSummary({ attachment }: AttachmentSummaryProps) {
  const [open, setOpen] = useState(true);
  const { summaryState, aiSummary } = attachment;

  if (summaryState === 'NOT_APPLICABLE') {
    return null;
  }

  if (summaryState === 'PENDING') {
    return (
      <p className="attachment-summary__note" role="status">
        <Icon name="hourglass_top" size={14} />
        {attachment.documentId
          ? 'Trợ lý AI đang đọc tài liệu...'
          : 'Tài liệu đang chờ duyệt, chưa tóm tắt được.'}
      </p>
    );
  }

  if (summaryState === 'UNAVAILABLE' || !aiSummary) {
    return (
      <p className="attachment-summary__note attachment-summary__note--muted">
        <Icon name="info" size={14} /> Chưa tạo được tóm tắt cho tài liệu này.
      </p>
    );
  }

  return (
    <div className="attachment-summary">
      <button
        type="button"
        className="attachment-summary__toggle"
        onClick={() => setOpen((current) => !current)}
        aria-expanded={open}
      >
        <Icon name="auto_awesome" size={14} />
        <span>Tóm tắt AI</span>
        <Icon name={open ? 'expand_less' : 'expand_more'} size={16} />
      </button>
      {open && <p className="attachment-summary__text">{aiSummary}</p>}
    </div>
  );
}
