import React from 'react';
import { CitationItem } from '../chat-api';

interface CitationDrawerProps {
  citation: CitationItem;
  onClose: () => void;
}

export const CitationDrawer: React.FC<CitationDrawerProps> = ({ citation, onClose }) => {
  const scorePercent = Math.round((citation.score || 0.75) * 100);
  const locatorLabel = citation.locator
    ? citation.locator.replace('page:', 'Trang ').replace('paragraph:', 'Đoạn ').replace('line:', 'Dòng ')
    : 'Tài liệu workspace';

  return (
    <aside className="citation-drawer">
      <div className="citation-drawer__header">
        <div className="citation-drawer__title-zone">
          <span className="material-symbols-outlined citation-drawer__icon">article</span>
          <h4 className="citation-drawer__filename">
            {citation.fileName || 'Tài liệu tham khảo'}
          </h4>
        </div>
        <button
          className="citation-drawer__close-btn"
          onClick={onClose}
          title="Đóng bảng trích dẫn"
        >
          <span className="material-symbols-outlined">close</span>
        </button>
      </div>

      <div className="citation-drawer__body">
        <div className="citation-drawer__badges">
          <span className="citation-drawer__badge citation-drawer__badge--page">
            <span className="material-symbols-outlined">tag</span>
            {locatorLabel}
          </span>
          <span className="citation-drawer__badge citation-drawer__badge--score">
            <span className="material-symbols-outlined">stars</span>
            {scorePercent}% độ khớp vector
          </span>
        </div>

        <div className="citation-drawer__section">
          <h5 className="citation-drawer__section-title">
            <span className="material-symbols-outlined">format_quote</span>
            Đoạn văn bản RAG trích xuất tham chiếu:
          </h5>
          <div className="citation-drawer__highlight-box">
            "{citation.excerpt}"
          </div>
        </div>

        <div className="citation-drawer__info-card">
          <div className="citation-drawer__info-title">
            <span className="material-symbols-outlined">info</span>
            Căn cứ suy luận RAG
          </div>
          <p className="citation-drawer__info-text">
            Đoạn văn bản trên là tri thức gốc được thu hồi từ tài liệu{' '}
            <strong>{citation.fileName || 'tài liệu workspace'}</strong> và được mô hình UniChat AI dùng làm bằng chứng thực tế cho câu trả lời.
          </p>
        </div>
      </div>
    </aside>
  );
};
