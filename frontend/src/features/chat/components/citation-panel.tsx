import React, { useState } from 'react';
import { CitationItem } from '../chat-api';
import './citation-panel.css';

interface CitationPanelProps {
  citations: CitationItem[];
  onSelectCitation?: ((citation: CitationItem) => void) | undefined;
}

export const CitationPanel: React.FC<CitationPanelProps> = ({ citations, onSelectCitation }) => {
  const [activeHoverIdx, setActiveHoverIdx] = useState<number | null>(null);

  if (!citations || citations.length === 0) return null;

  return (
    <div className="citation-panel">
      <div className="citation-panel__header">
        <span className="material-symbols-outlined citation-panel__icon">find_in_page</span>
        <span className="citation-panel__label">Nguồn trích dẫn RAG ({citations.length}):</span>
      </div>

      <div className="citation-pills-list">
        {citations.map((c, idx) => {
          const scorePercent = Math.round((c.score || 0.75) * 100);
          const locatorLabel = c.locator ? c.locator.replace('page:', 'Trang ').replace('paragraph:', 'Đoạn ').replace('line:', 'Dòng ') : 'Tài liệu';
          const title = c.fileName && c.fileName !== 'Tài liệu' ? c.fileName : 'Tài liệu tham khảo';

          return (
            <div
              key={idx}
              className="citation-pill-container"
              onMouseEnter={() => setActiveHoverIdx(idx)}
              onMouseLeave={() => setActiveHoverIdx(null)}
            >
              <button
                className="citation-pill-btn"
                type="button"
                onClick={() => onSelectCitation?.(c)}
                title="Nhấp để xem trích dẫn chi tiết trong tài liệu gốc"
              >
                <span className="material-symbols-outlined citation-pill-icon">description</span>
                <span className="citation-pill-name">{title} ({locatorLabel})</span>
                <span className="citation-pill-score">{scorePercent}%</span>
              </button>

              {activeHoverIdx === idx && (
                <div className="citation-popover" onClick={() => onSelectCitation?.(c)}>
                  <div className="citation-popover__header">
                    <span className="citation-popover__filename">{title}</span>
                    <span className="citation-popover__score">{scorePercent}% khớp</span>
                  </div>
                  <div className="citation-popover__locator">
                    <span className="material-symbols-outlined">push_pin</span>
                    <span>Vị trí: {locatorLabel}</span>
                  </div>
                  <div className="citation-popover__excerpt">"{c.excerpt}"</div>
                  <div className="citation-popover__footer">
                    <span>Mở xem chi tiết bên cạnh ➔</span>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
