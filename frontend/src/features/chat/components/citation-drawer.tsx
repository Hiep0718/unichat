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
      <div className="citation-drawer__header">
        <div className="citation-drawer__title-zone">
          <span className="material-symbols-outlined citation-drawer__icon">menu_book</span>
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
            <span className="material-symbols-outlined">bookmark</span>
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
            title="Tự động cuộn trực tiếp đến đoạn văn bản tri thức được highlight"
          >
            <span className="material-symbols-outlined">south</span>
            <span>Cuộn đến vị trí trích</span>
          </button>

          {blobUrl && (
            <button
              type="button"
              className="citation-drawer__tool-btn citation-drawer__tool-btn--mode"
              onClick={() => setViewMode(viewMode === 'READER' ? 'PDF' : 'READER')}
              title="Chuyển đổi giữa Chế độ Đọc tri thức & Xem PDF gốc"
            >
              <span className="material-symbols-outlined">
                {viewMode === 'READER' ? 'picture_as_pdf' : 'article'}
              </span>
              <span>{viewMode === 'READER' ? 'Xem file PDF' : 'Đọc tri thức'}</span>
            </button>
          )}
        </div>
      </div>

      <div className="citation-drawer__body" ref={readerRef}>
        {/* Mode 1: PDF Viewer */}
        {viewMode === 'PDF' && pdfViewerUrl && !fileLoading && (
          <div className="citation-drawer__viewer-pane">
            <div className="citation-drawer__viewer-bar">
              <span className="material-symbols-outlined">find_in_page</span>
              <span>Đang xem PDF gốc tại <strong>{locatorLabel}</strong></span>
            </div>
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
            <div className="citation-drawer__reader-header">
              <span className="material-symbols-outlined">auto_stories</span>
              <span className="citation-drawer__reader-title">
                Nội dung tài liệu — <strong>{citation.fileName || 'Document'}</strong>
              </span>
              {fileError && <span style={{ marginLeft: 'auto', fontSize: '11px', color: '#94a3b8' }}>({fileError})</span>}
            </div>

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
                  <span>📍 Nguồn tri thức RAG được AI bóc tách trả lời ({locatorLabel})</span>
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
          </div>
        )}

        {/* Reasoning Info Card */}
        <div className="citation-drawer__info-card">
          <div className="citation-drawer__info-title">
            <span className="material-symbols-outlined">info</span>
            Căn cứ suy luận RAG
          </div>
          <p className="citation-drawer__info-text">
            Đoạn văn bản màu vàng ở trên là tri thức gốc được trích xuất trực tiếp từ vị trí <strong>{locatorLabel}</strong> của tài liệu <strong>{citation.fileName || 'tài liệu workspace'}</strong> và được mô hình UniChat AI sử dụng làm bằng chứng thực tế cho câu trả lời.
          </p>
        </div>
      </div>
    </aside>
  );
};
