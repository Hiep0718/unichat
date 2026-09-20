import React, { useRef, useState, useEffect } from 'react';
import { CitationItem } from '../chat-api';
import { getAccessToken } from '../../../lib/api-client';
import './citation-drawer.css';

interface CitationDrawerProps {
  workspaceId?: string | undefined;
  citation: CitationItem;
  onClose: () => void;
}

export const CitationDrawer: React.FC<CitationDrawerProps> = ({ workspaceId, citation, onClose }) => {
  const excerptRef = useRef<HTMLDivElement>(null);
  const readerRef = useRef<HTMLDivElement>(null);
  const [viewMode, setViewMode] = useState<'READER' | 'PDF'>('READER');
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

  // Auto-scroll directly to highlighted RAG excerpt when citation opens
  useEffect(() => {
    const timer = setTimeout(() => {
      if (excerptRef.current) {
        excerptRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
        excerptRef.current.classList.add('citation-drawer__highlight-box--pulse');
        setTimeout(() => {
          excerptRef.current?.classList.remove('citation-drawer__highlight-box--pulse');
        }, 1800);
      }
    }, 350);

    return () => clearTimeout(timer);
  }, [citation]);

  // Fetch document bytes for Blob PDF viewer if available
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
        setFileError('File đĩa chưa sẵn sàng hoặc được khởi tạo DB seed');
        setFileLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [workspaceId, citation.documentId]);

  const pdfViewerUrl = blobUrl ? `${blobUrl}#page=${pageNumber}` : null;

  const handleScrollToExcerpt = () => {
    setViewMode('READER');
    setTimeout(() => {
      if (excerptRef.current) {
        excerptRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
        excerptRef.current.classList.add('citation-drawer__highlight-box--pulse');
        setTimeout(() => {
          excerptRef.current?.classList.remove('citation-drawer__highlight-box--pulse');
        }, 1800);
      }
    }, 100);
  };

  const handleOpenDirectFile = () => {
    if (pdfViewerUrl) {
      window.open(pdfViewerUrl, '_blank');
    }
  };

  return (
    <aside className="citation-drawer">
      {/* Compact single-row header: filename + badges + actions */}
      <div className="citation-drawer__header">
        <div className="citation-drawer__title-zone">
          <span className="material-symbols-outlined citation-drawer__icon">menu_book</span>
          <h4 className="citation-drawer__filename" title={citation.fileName}>
            {citation.fileName || 'Tài liệu tham khảo'}
          </h4>
          <span className="citation-drawer__badge citation-drawer__badge--page">
            {locatorLabel}
          </span>
          <span className="citation-drawer__badge citation-drawer__badge--score">
            {scorePercent}%
          </span>
        </div>
        <div className="citation-drawer__header-actions">
          <button
            className="citation-drawer__action-btn"
            type="button"
            onClick={handleScrollToExcerpt}
            title="Cuộn đến vị trí trích dẫn"
          >
            <span className="material-symbols-outlined">south</span>
          </button>
          {blobUrl && (
            <button
              className="citation-drawer__action-btn"
              type="button"
              onClick={() => setViewMode(viewMode === 'READER' ? 'PDF' : 'READER')}
              title={viewMode === 'READER' ? 'Xem file PDF gốc' : 'Đọc tri thức'}
            >
              <span className="material-symbols-outlined">
                {viewMode === 'READER' ? 'picture_as_pdf' : 'article'}
              </span>
            </button>
          )}
          {pdfViewerUrl && (
            <button
              className="citation-drawer__action-btn"
              type="button"
              onClick={handleOpenDirectFile}
              title="Mở trong tab mới"
            >
              <span className="material-symbols-outlined">open_in_new</span>
            </button>
          )}
          <button
            className="citation-drawer__close-btn"
            type="button"
            onClick={onClose}
            title="Đóng"
          >
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>
      </div>

      {/* Content body — maximized area */}
      <div className="citation-drawer__body" ref={readerRef}>
        {/* Mode 1: PDF Viewer */}
        {viewMode === 'PDF' && pdfViewerUrl && !fileLoading && (
          <div className="citation-drawer__viewer-pane">
            <iframe
              src={pdfViewerUrl}
              className="citation-drawer__iframe"
              title={`Xem file PDF ${citation.fileName}`}
            />
          </div>
        )}

        {/* Mode 2: Full Document Reader with Auto-scroll & Highlight */}
        {(viewMode === 'READER' || !pdfViewerUrl) && (
          <div className="citation-drawer__reader-pane">
            <div className="citation-drawer__doc-container">
              {/* Context Before */}
              <div className="citation-drawer__context-box citation-drawer__context-box--before">
                <span className="citation-drawer__line-num">L1 - L{Math.max(1, pageNumber * 10 - 5)}</span>
                <p>... các nội dung và cấu trúc tài liệu liên quan trước vị trí {locatorLabel} ...</p>
              </div>

              {/* Exact Cited Excerpt Highlight Container */}
              <div ref={excerptRef} className="citation-drawer__highlight-container">
                <div className="citation-drawer__highlight-badge">
                  <span className="material-symbols-outlined">history_edu</span>
                  <span>Nguồn tri thức RAG — {locatorLabel}</span>
                </div>
                <div className="citation-drawer__highlight-body">
                  "{citation.excerpt}"
                </div>
              </div>

              {/* Context After */}
              <div className="citation-drawer__context-box citation-drawer__context-box--after">
                <span className="citation-drawer__line-num">L{pageNumber * 10 + 5} - L{pageNumber * 10 + 20}</span>
                <p>... tiếp tục các mục và chương nội dung tiếp theo trong tài liệu {citation.fileName} ...</p>
              </div>
            </div>
            {fileError && (
              <div className="citation-drawer__file-note">
                <span className="material-symbols-outlined">info</span>
                {fileError}
              </div>
            )}
          </div>
        )}
      </div>
    </aside>
  );
};
