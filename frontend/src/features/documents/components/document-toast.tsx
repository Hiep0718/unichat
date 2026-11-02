/**
 * The passing note after an upload, a split or a deletion.
 *
 * Rendered into `document.body` so the card's own `overflow` cannot clip it,
 * and split out of the table because a transient message is not part of the
 * list it reports on.
 */
import { createPortal } from 'react-dom';

import './document-toast.css';

export interface DocumentNotice {
  readonly type: 'success' | 'error';
  readonly title: string;
  readonly message: string;
}

interface DocumentToastProps {
  readonly notice: DocumentNotice | null;
  readonly onClose: () => void;
}

export function DocumentToast({ notice, onClose }: DocumentToastProps) {
  if (!notice) return null;

  return createPortal(
    <div
      className={`doc-toast doc-toast--${notice.type}`}
      role={notice.type === 'error' ? 'alert' : 'status'}
    >
      <div className={`doc-toast__icon doc-toast__icon--${notice.type}`} aria-hidden="true">
        {notice.type === 'success' ? '✓' : '✕'}
      </div>
      <div className="doc-toast__body">
        <h5 className="doc-toast__title">{notice.title}</h5>
        <p className="doc-toast__message">{notice.message}</p>
      </div>
      <button
        type="button"
        className="doc-toast__close"
        onClick={onClose}
        title="Đóng thông báo"
        aria-label="Đóng thông báo"
      >
        <span aria-hidden="true">&times;</span>
      </button>
    </div>,
    document.body,
  );
}
