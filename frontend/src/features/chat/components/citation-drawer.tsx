import React, { useRef, useState, useEffect } from 'react';
import { CitationItem } from '../chat-api';
import { getAccessToken } from '../../../lib/api-client';

interface CitationDrawerProps {
  workspaceId?: string | undefined;
  citation: CitationItem;
  onClose: () => void;
}

export const CitationDrawer: React.FC<CitationDrawerProps> = ({ workspaceId, citation, onClose }) => {
  const excerptRef = useRef<HTMLDivElement>(null);
  const [viewMode, setViewMode] = useState<'SPLIT' | 'EXCERPT_ONLY'>('SPLIT');
  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  const [fileLoading, setFileLoading] = useState<boolean>(false);
  const [fileError, setFileError] = useState<string | null>(null);

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

  useEffect(() => {
    if (!workspaceId || !citation.documentId) return;

    let isMounted = true;
    setFileLoading(true);
    setFileError(null);

    const token = getAccessToken();
    const headers: Record<string, string> = {};
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const downloadEndpoint = `/api/v1/workspaces/${workspaceId}/documents/${citation.documentId}/download`;

    fetch(downloadEndpoint, { headers })
      .then((res) => {
        if (!res.ok) {
          throw new Error(`HTTP ${res.status}`);
        }
        return res.blob();
      })
      .then((blob) => {
        if (!isMounted) return;
        const objectUrl = URL.createObjectURL(blob);
        setBlobUrl(objectUrl);
        setFileLoading(false);
      })
      .catch((err) => {
        if (!isMounted) return;
        console.warn('Không thể tải file PDF đĩa:', err);
        setFileError('File đĩa chưa sẵn sàng hoặc được tạo bằng DB seed');
        setFileLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [workspaceId, citation.documentId]);

  const pdfViewerUrl = blobUrl ? `${blobUrl}#page=${pageNumber}` : null;

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
              title="Mở file tài liệu trong cửa sổ trình duyệt mới"
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

          {blobUrl && (
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
        {/* Loading state for PDF */}
        {fileLoading && (
          <div className="citation-drawer__loading-bar">
            <span className="material-symbols-outlined citation-drawer__spin">sync</span>
            <span>Đang xác thực & tải file PDF ({locatorLabel})...</span>
          </div>
        )}

        {/* Full PDF Blob Viewer Pane */}
        {pdfViewerUrl && viewMode === 'SPLIT' && !fileLoading && (
          <div className="citation-drawer__viewer-pane">
            <div className="citation-drawer__viewer-bar">
              <span className="material-symbols-outlined">find_in_page</span>
              <span>Đang mở tài liệu PDF tại <strong>{locatorLabel}</strong></span>
            </div>
            <iframe
              src={pdfViewerUrl}
              className="citation-drawer__iframe"
              title={`Xem tài liệu ${citation.fileName}`}
            />
          </div>
        )}

        {/* Fallback info when physical PDF file not stored on disk */}
        {fileError && !fileLoading && (
          <div className="citation-drawer__fallback-card">
            <div className="citation-drawer__fallback-header">
              <span className="material-symbols-outlined">menu_book</span>
              <span>Chế độ đọc trích xuất RAG (Tài liệu gốc lưu DB Seed)</span>
            </div>
            <p>Hệ thống tự động cuộn và hiển thị tri thức gốc được bóc tách bên dưới.</p>
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
