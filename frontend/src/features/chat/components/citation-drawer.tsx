import React, { useRef, useState } from 'react';
import { CitationItem } from '../chat-api';

interface CitationDrawerProps {
  workspaceId?: string | undefined;
  citation: CitationItem;
  onClose: () => void;
}

export const CitationDrawer: React.FC<CitationDrawerProps> = ({ workspaceId, citation, onClose }) => {
  const excerptRef = useRef<HTMLDivElement>(null);
  const [viewMode, setViewMode] = useState<'SPLIT' | 'EXCERPT_ONLY'>('SPLIT');

  const scorePercent = Math.round((citation.score || 0.75) * 100);
  
  // Extract page number from locator (e.g. "page:28" -> 28)
  let pageNumber = 1;
  if (citation.locator) {
    const match = citation.locator.match(/page:(\d+)/i) || citation.locator.match(/(\d+)/);
    if (match && match[1]) {
      pageNumber = parseInt(match[1], 10);
    }
  }

  const locatorLabel = citation.locator
    ? citation.locator.replace('page:', 'Trang ').replace('paragraph:', 'Đoạn ').replace('line:', 'Dòng ')
    : 'Tài liệu workspace';

  const docUrl = workspaceId && citation.documentId
    ? `/api/v1/workspaces/${workspaceId}/documents/${citation.documentId}/download`
    : null;

  const pdfViewerUrl = docUrl ? `${docUrl}#page=${pageNumber}` : null;

  const handleScrollToExcerpt = () => {
    if (excerptRef.current) {
      excerptRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
      excerptRef.current.classList.add('citation-drawer__highlight-box--pulse');
      setTimeout(() => {
        excerptRef.current?.classList.remove('citation-drawer__highlight-box--pulse');
      }, 1500);
    }
  };

  const handleOpenDirectFile = () => {
    if (pdfViewerUrl) {
      window.open(pdfViewerUrl, '_blank');
    }
  };

  return (
    <aside className="citation-drawer">
      <div className="citation-drawer__header">
        <div className="citation-drawer__title-zone">
          <span className="material-symbols-outlined citation-drawer__icon">picture_as_pdf</span>
          <h4 className="citation-drawer__filename" title={citation.fileName}>
            {citation.fileName || 'Tài liệu tham khảo'}
          </h4>
        </div>
        <div className="citation-drawer__header-actions">
          {pdfViewerUrl && (
            <button
              className="citation-drawer__action-btn"
              type="button"
              onClick={handleOpenDirectFile}
              title="Mở file tài liệu trong cửa sổ mới"
            >
              <span className="material-symbols-outlined">open_in_new</span>
            </button>
          )}
          <button
            className="citation-drawer__close-btn"
            type="button"
            onClick={onClose}
            title="Đóng bảng tài liệu"
          >
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>
      </div>

      <div className="citation-drawer__toolbar">
        <div className="citation-drawer__badges">
          <span className="citation-drawer__badge citation-drawer__badge--page">
            <span className="material-symbols-outlined">description</span>
            {locatorLabel}
          </span>
          <span className="citation-drawer__badge citation-drawer__badge--score">
            <span className="material-symbols-outlined">stars</span>
            {scorePercent}% trùng khớp
          </span>
        </div>

        <div className="citation-drawer__tools">
          <button
            type="button"
            className="citation-drawer__tool-btn"
            onClick={handleScrollToExcerpt}
            title="Tự động cuộn đến vị trí đoạn văn bản trích dẫn"
          >
            <span className="material-symbols-outlined">south</span>
            <span>Cuộn đến đoạn trích</span>
          </button>

          {pdfViewerUrl && (
            <button
              type="button"
              className="citation-drawer__tool-btn citation-drawer__tool-btn--mode"
              onClick={() => setViewMode(viewMode === 'SPLIT' ? 'EXCERPT_ONLY' : 'SPLIT')}
              title="Thay đổi chế độ xem tài liệu"
            >
              <span className="material-symbols-outlined">
                {viewMode === 'SPLIT' ? 'visibility_off' : 'preview'}
              </span>
              <span>{viewMode === 'SPLIT' ? 'Ẩn PDF' : 'Xem PDF'}</span>
            </button>
          )}
        </div>
      </div>

      <div className="citation-drawer__body">
        {/* Full PDF / File Viewer Pane */}
        {pdfViewerUrl && viewMode === 'SPLIT' && (
          <div className="citation-drawer__viewer-pane">
            <div className="citation-drawer__viewer-bar">
              <span className="material-symbols-outlined">find_in_page</span>
              <span>Đang mở tài liệu tại <strong>{locatorLabel}</strong></span>
            </div>
            <iframe
              src={pdfViewerUrl}
              className="citation-drawer__iframe"
              title={`Xem tài liệu ${citation.fileName}`}
            />
          </div>
        )}

        {/* Highlighted Excerpt Section */}
        <div className="citation-drawer__section">
          <h5 className="citation-drawer__section-title">
            <span className="material-symbols-outlined">format_quote</span>
            Đoạn văn bản RAG trích xuất tham chiếu:
          </h5>
          <div ref={excerptRef} className="citation-drawer__highlight-box">
            "{citation.excerpt}"
          </div>
        </div>

        {/* Reasoning Info Card */}
        <div className="citation-drawer__info-card">
          <div className="citation-drawer__info-title">
            <span className="material-symbols-outlined">info</span>
            Căn cứ suy luận RAG
          </div>
          <p className="citation-drawer__info-text">
            Đoạn văn bản trên là tri thức gốc được trích xuất từ tài liệu{' '}
            <strong>{citation.fileName || 'tài liệu workspace'}</strong> (vị trí: {locatorLabel}) và được mô hình UniChat AI sử dụng làm bằng chứng thực tế cho câu trả lời.
          </p>
        </div>
      </div>
    </aside>
  );
};
