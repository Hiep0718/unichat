/**
 * The assistant's summary of a document attached to a post.
 *
 * A long PDF asks every reader to open it before they know whether it is worth
 * opening. A member asks for the summary here; once produced it is shown to
 * everyone. When none is coming, this says so rather than leaving an empty
 * space that looks like a loading bug.
 */
import { useState } from 'react';

import { Icon } from '../../../components/icon';
import { useAttachmentSummary } from '../use-attachment-summary';

import type { PostAttachment } from '../community-api';
import './attachment-summary.css';

interface AttachmentSummaryProps {
  readonly workspaceId: string;
  readonly discussionId: string;
  readonly attachment: PostAttachment;
}

export function AttachmentSummary({ workspaceId, discussionId, attachment }: AttachmentSummaryProps) {
  const summary = useAttachmentSummary(workspaceId, discussionId, attachment);
  const { summaryState, aiSummary, documentId } = summary.attachment;

  if (summaryState === 'NOT_APPLICABLE') {
    return null;
  }
  if (!documentId) {
    return (
      <p className="attachment-summary__note" role="status">
        <Icon name="hourglass_top" size={14} /> Tài liệu đang chờ duyệt, chưa tóm tắt được.
      </p>
    );
  }
  if (summary.generating) {
    return (
      <p className="attachment-summary__note" role="status">
        <Icon name="hourglass_top" size={14} /> Trợ lý AI đang đọc tài liệu...
      </p>
    );
  }
  if (summaryState === 'READY' && aiSummary) {
    return <SummaryText text={aiSummary} />;
  }
  return (
    <SummaryRequest
      failedBefore={summaryState !== 'PENDING'}
      error={summary.error}
      onRequest={summary.request}
    />
  );
}

/** A produced summary the reader can fold away. */
function SummaryText({ text }: { readonly text: string }) {
  const [open, setOpen] = useState(true);
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
      {open && <p className="attachment-summary__text">{text}</p>}
    </div>
  );
}

interface SummaryRequestProps {
  /** The last attempt produced nothing, so the button offers to try again. */
  readonly failedBefore: boolean;
  readonly error: string | null;
  readonly onRequest: () => void;
}

/** The button that asks for a summary, with the reason the last ask failed. */
function SummaryRequest({ failedBefore, error, onRequest }: SummaryRequestProps) {
  return (
    <div className="attachment-summary">
      {failedBefore && (
        <p className="attachment-summary__note attachment-summary__note--muted">
          <Icon name="info" size={14} /> Chưa tạo được tóm tắt cho tài liệu này.
        </p>
      )}
      <button type="button" className="attachment-summary__toggle" onClick={onRequest}>
        <Icon name="auto_awesome" size={14} />
        <span>{failedBefore ? 'Thử tóm tắt lại' : 'Tóm tắt bằng AI'}</span>
      </button>
      {error && (
        <p className="attachment-summary__note attachment-summary__note--error" role="alert">
          <Icon name="error_outline" size={14} /> {error}
        </p>
      )}
    </div>
  );
}
