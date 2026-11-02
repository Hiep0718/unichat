import { useRef, useState } from 'react';
import { useCitationDocument } from '../use-citation-document';
import type { CitationItem } from '../chat-api';
import './citation-drawer.css';

interface CitationDrawerProps {
  workspaceId?: string | undefined;
  citation: CitationItem;
  onClose: () => void;
  openAtSource?: boolean;
}

/** Formats locators like 'page:1' or 'slide:21' to friendly Vietnamese labels. */
function formatLocator(locator?: string | null): string {
  if (!locator) return 'Đoạn trích dẫn';
  return locator
    .replace(/^page:(\d+)$/i, 'Trang $1')
    .replace(/^paragraph:(\d+)$/i, 'Đoạn $1')
    .replace(/^line:(\d+)$/i, 'Dòng $1')
    .replace(/^slide:(\d+)$/i, 'Slide $1')
    .replace(/^sheet:(\d+)$/i, 'Sheet $1')
    .replace(/^section:(\d+)$/i, 'Mục $1');
}

/** Normalizes fragmented PDF chunk excerpts by joining broken line breaks. */
export function cleanExcerptText(raw: string): string {
  if (!raw) return '';
  const lines = raw.replace(/\r\n/g, '\n').trim().split('\n').map((l) => l.trim());
  const paragraphs: string[] = [];
  let buffer: string[] = [];
  const flush = () => { if (buffer.length > 0) { paragraphs.push(buffer.join(' ')); buffer = []; } };

  for (const line of lines) {
    const last = buffer[buffer.length - 1];
    if (!line) {
      if (last !== undefined && /[.?!:;]$/.test(last)) flush();
      continue;
    }
    if (/^[-*•–—]\s+|^\d+[.)]\s+|^#{1,6}\s+/u.test(line)) {
      flush(); paragraphs.push(line); continue;
    }
    if (last !== undefined && last.endsWith('-')) {
      buffer.pop();
      buffer.push(last.slice(0, -1) + line);
    } else {
      buffer.push(line);
    }
  }
  flush();
  return paragraphs.join('\n\n').trim() || raw;
}

interface DrawerHeaderProps {
  fileName?: string | undefined;
  locator?: string | undefined;
  viewerUrl: string | null;
  blobUrl: string | null;
  viewMode: 'READER' | 'PDF';
  onToggleView: (mode: 'READER' | 'PDF') => void;
  onClose: () => void;
}

function DrawerHeader({
  fileName,
  locator,
  viewerUrl,
  blobUrl,
  viewMode,
  onToggleView,
  onClose,
}: DrawerHeaderProps) {
  return (
    <div className="citation-drawer__header">
      <div className="citation-drawer__title-zone">
        <div className="citation-drawer__icon-badge" aria-hidden="true">
          <span className="material-symbols-outlined citation-drawer__icon">
            {fileName?.toLowerCase().endsWith('.pdf') ? 'picture_as_pdf' : 'description'}
          </span>
        </div>
        <div className="citation-drawer__file-meta">
          <h4 className="citation-drawer__filename" title={fileName}>{fileName}</h4>
          <span className="citation-drawer__badge citation-drawer__badge--page">
            {formatLocator(locator)}
          </span>
        </div>
      </div>
      <div className="citation-drawer__header-actions">
        {viewerUrl && (
          <div className="citation-drawer__view-toggle" role="tablist" aria-label="Chế độ xem">
            <button
              type="button"
              role="tab"
              aria-selected={viewMode === 'PDF'}
              className={`citation-drawer__toggle-tab ${viewMode === 'PDF' ? 'citation-drawer__toggle-tab--active' : ''}`}
              onClick={() => onToggleView('PDF')}
            >
              <span className="material-symbols-outlined" aria-hidden="true">menu_book</span>
              <span>Xem PDF</span>
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={viewMode === 'READER'}
              className={`citation-drawer__toggle-tab ${viewMode === 'READER' ? 'citation-drawer__toggle-tab--active' : ''}`}
              onClick={() => onToggleView('READER')}
            >
              <span className="material-symbols-outlined" aria-hidden="true">format_quote</span>
              <span>Trích đoạn</span>
            </button>
          </div>
        )}
        {blobUrl && (
          <a
            className="citation-drawer__icon-btn"
            href={blobUrl}
            download={fileName}
            title="Tải tài liệu gốc"
            aria-label="Tải tài liệu"
          >
            <span className="material-symbols-outlined" aria-hidden="true">download</span>
          </a>
        )}
        <button
          className="citation-drawer__icon-btn citation-drawer__icon-btn--close"
          type="button"
          onClick={onClose}
          title="Đóng chi tiết trích dẫn"
          aria-label="Đóng trích dẫn"
        >
          <span className="material-symbols-outlined" aria-hidden="true">close</span>
        </button>
      </div>
    </div>
  );
}

interface ExcerptCardProps {
  citation: CitationItem;
  copied: boolean;
  onCopy: () => void;
  onOpenPdf?: (() => void) | undefined;
}

function ExcerptChunkCard({ citation, copied, onCopy, onOpenPdf }: ExcerptCardProps) {
  const cleanedText = cleanExcerptText(citation.excerpt);

  return (
    <div className="citation-drawer__chunk-card">
      <div className="citation-drawer__chunk-header">
        <div className="citation-drawer__chunk-meta">
          <div className="citation-drawer__quote-icon-pill" aria-hidden="true">
            <span className="material-symbols-outlined citation-drawer__chunk-icon">format_quote</span>
          </div>
          <div className="citation-drawer__chunk-titles">
            <span className="citation-drawer__chunk-title">Đoạn trích đối chiếu từ tài liệu</span>
            <span className="citation-drawer__chunk-locator">{formatLocator(citation.locator)}</span>
          </div>
        </div>
        <button
          type="button"
          className={`citation-drawer__copy-btn ${copied ? 'citation-drawer__copy-btn--copied' : ''}`}
          onClick={onCopy}
          title="Sao chép đoạn trích này"
        >
          <span className="material-symbols-outlined" aria-hidden="true">
            {copied ? 'check' : 'content_copy'}
          </span>
          <span>{copied ? 'Đã sao chép' : 'Sao chép'}</span>
        </button>
      </div>
      <div className="citation-drawer__chunk-content">
        <p className="citation-drawer__chunk-text">{cleanedText}</p>
      </div>
      <div className="citation-drawer__chunk-footer">
        <div className="citation-drawer__verify-badge">
          <span className="material-symbols-outlined" aria-hidden="true">verified</span>
          <span>Trích dẫn đã được kiểm tra tính xác thực qua RAG</span>
        </div>
        {onOpenPdf && (
          <button
            type="button"
            className="citation-drawer__jump-pdf-btn"
            onClick={onOpenPdf}
            title="Xem trong tài liệu gốc"
          >
            <span>Mở trang PDF</span>
            <span className="material-symbols-outlined" aria-hidden="true">arrow_forward</span>
          </button>
        )}
      </div>
    </div>
  );
}

/** Displays actual excerpts and locators; defaults to PDF viewer when available. */
export function CitationDrawer({ workspaceId, citation, onClose, openAtSource = false }: CitationDrawerProps) {
  const excerptRef = useRef<HTMLDivElement>(null);
  const isPdf = Boolean(citation.fileName?.toLowerCase().endsWith('.pdf'));
  const [viewMode, setViewMode] = useState<'READER' | 'PDF'>(openAtSource || isPdf ? 'PDF' : 'READER');
  const [copied, setCopied] = useState(false);
  const { blobUrl, fileError, fileLoading } = useCitationDocument(workspaceId, citation.documentId);
  const pageMatch = /^(?:page|slide):(\d+)$/i.exec(citation.locator ?? '');
  const viewerUrl = blobUrl && isPdf
    ? `${blobUrl}${pageMatch ? `#page=${pageMatch[1]}` : ''}` : null;

  const copyExcerpt = async () => {
    try {
      await navigator.clipboard.writeText(cleanExcerptText(citation.excerpt));
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Ignore clipboard write issues
    }
  };

  const handleToggleView = (mode: 'READER' | 'PDF') => {
    setViewMode(mode);
    if (mode === 'READER') {
      excerptRef.current?.scrollIntoView({ block: 'center' });
    }
  };

  return (
    <aside className="citation-drawer" aria-label="Trích dẫn đã kiểm tra">
      <DrawerHeader
        fileName={citation.fileName}
        locator={citation.locator}
        viewerUrl={viewerUrl}
        blobUrl={blobUrl}
        viewMode={viewMode}
        onToggleView={handleToggleView}
        onClose={onClose}
      />
      <div className="citation-drawer__body">
        {fileLoading && (
          <div className="citation-drawer__state citation-drawer__state--loading" role="status">
            <span className="material-symbols-outlined citation-drawer__state-spinner" aria-hidden="true">sync</span>
            <p>Đang tải tài liệu PDF đến {formatLocator(citation.locator)}…</p>
          </div>
        )}
        {fileError && (
          <div className="citation-drawer__state citation-drawer__state--error" role="alert">
            <span className="material-symbols-outlined" aria-hidden="true">error</span>
            <p>{fileError}</p>
          </div>
        )}
        {viewMode === 'PDF' && viewerUrl ? (
          <iframe src={viewerUrl} title={`Tài liệu ${citation.fileName}`} className="citation-drawer__iframe" />
        ) : (
          (!fileLoading || viewMode === 'READER') && (
            <div ref={excerptRef} className="citation-drawer__excerpt-container">
              <ExcerptChunkCard
                citation={citation}
                copied={copied}
                onCopy={() => void copyExcerpt()}
                onOpenPdf={viewerUrl ? () => setViewMode('PDF') : undefined}
              />
            </div>
          )
        )}
      </div>
    </aside>
  );
}
