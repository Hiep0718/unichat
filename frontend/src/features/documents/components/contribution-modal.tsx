/**
 * Collects the context a contributed document needs before it is uploaded.
 *
 * A filename alone gives the owner nothing to decide on, so a member without
 * publish rights must say what the document is and why the workspace needs it.
 */
import { useState } from 'react';

import { Icon } from '../../../components/icon';
import type { ContributionContext } from '../document-api';
import './contribution-modal.css';

const MAX_SUMMARY = 500;
const MAX_REASON = 1000;

interface ContributionModalProps {
  /** Files the member picked, shown so they can confirm what they are sending. */
  readonly files: readonly File[];
  readonly onCancel: () => void;
  readonly onConfirm: (context: ContributionContext) => void;
}

/** Renders a human-readable file size. */
function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function ContributionModal({ files, onCancel, onConfirm }: ContributionModalProps) {
  const [summary, setSummary] = useState('');
  const [reason, setReason] = useState('');

  const canSubmit = summary.trim().length > 0 && reason.trim().length > 0;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;
    onConfirm({ summary: summary.trim(), reason: reason.trim() });
  };

  return (
    <div className="contribution-overlay" onClick={onCancel}>
      <div className="contribution-modal" onClick={(e) => e.stopPropagation()}>
        <div className="contribution-modal__header">
          <h2 className="contribution-modal__title">Đóng góp tài liệu</h2>
          <button type="button" className="contribution-modal__close" onClick={onCancel}>
            <Icon name="close" size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="contribution-modal__body">
            <div className="contribution-modal__notice">
              <Icon name="info" size={18} />
              <span>
                Tài liệu của bạn sẽ được <strong>chủ Workspace duyệt</strong> trước khi AI
                sử dụng. Hãy mô tả rõ để người duyệt hiểu và quyết định nhanh hơn.
              </span>
            </div>

            <div className="contribution-modal__files">
              <span className="contribution-modal__files-label">
                {files.length === 1 ? 'Tệp đã chọn' : `${files.length} tệp đã chọn`}
              </span>
              <ul className="contribution-modal__file-list">
                {files.map((file) => (
                  <li key={`${file.name}-${file.size}`} className="contribution-modal__file">
                    <Icon name="description" size={16} />
                    <span className="contribution-modal__file-name">{file.name}</span>
                    <span className="contribution-modal__file-size">{formatBytes(file.size)}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="contribution-modal__field">
              <label className="contribution-modal__label" htmlFor="contribution-summary">
                Tài liệu này nói về gì? <span aria-hidden="true">*</span>
              </label>
              <input
                id="contribution-summary"
                className="contribution-modal__input"
                value={summary}
                onChange={(e) => setSummary(e.target.value)}
                placeholder="VD: Slide chương 3 — Index và Aggregation Pipeline trong MongoDB"
                maxLength={MAX_SUMMARY}
                required
                autoFocus
              />
              <span className="contribution-modal__count">
                {summary.length}/{MAX_SUMMARY}
              </span>
            </div>

            <div className="contribution-modal__field">
              <label className="contribution-modal__label" htmlFor="contribution-reason">
                Vì sao Workspace cần tài liệu này? <span aria-hidden="true">*</span>
              </label>
              <textarea
                id="contribution-reason"
                className="contribution-modal__textarea"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="VD: Em hỏi AI về cách MongoDB chọn index nhưng bị từ chối vì tài liệu hiện có không đề cập. Slide này của thầy có phần đó."
                maxLength={MAX_REASON}
                required
              />
              <span className="contribution-modal__count">
                {reason.length}/{MAX_REASON}
              </span>
            </div>
          </div>

          <div className="contribution-modal__footer">
            <button type="button" className="contribution-modal__cancel" onClick={onCancel}>
              Hủy
            </button>
            <button type="submit" className="contribution-modal__submit" disabled={!canSubmit}>
              <Icon name="upload" size={16} />
              Gửi đóng góp
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
