import { useRef, useState } from 'react';
import { useCitationDocument } from '../use-citation-document';
import type { CitationItem } from '../chat-api';
import './citation-drawer.css';

interface CitationDrawerProps {
  workspaceId?: string | undefined;
  citation: CitationItem;
  onClose: () => void;
}

/** Displays actual excerpts and locators; downloads use the shared auth coordinator. */
export function CitationDrawer({ workspaceId, citation, onClose }: CitationDrawerProps) {
  const excerptRef = useRef<HTMLDivElement>(null);
  const [viewMode, setViewMode] = useState<'READER' | 'PDF'>('READER');
  const { blobUrl, fileError, fileLoading } = useCitationDocument(workspaceId, citation.documentId);
  const pageMatch = /^page:(\d+)$/i.exec(citation.locator ?? '');
  const viewerUrl = blobUrl && citation.fileName?.toLowerCase().endsWith('.pdf')
    ? `${blobUrl}${pageMatch ? `#page=${pageMatch[1]}` : ''}` : null;
  return <aside className="citation-drawer" aria-label="Trích dẫn đã kiểm tra">
    <div className="citation-drawer__header"><div className="citation-drawer__title-zone">
      <h4 className="citation-drawer__filename">{citation.fileName}</h4>
      <span className="citation-drawer__badge">{citation.locator || 'Chưa có vị trí nguồn'}</span>
      <span className="citation-drawer__badge">Trích dẫn đã kiểm tra</span>
    </div><div className="citation-drawer__header-actions">
      <button className="citation-drawer__action-btn" type="button" onClick={() => { setViewMode('READER'); excerptRef.current?.scrollIntoView({ block: 'center' }); }}>
        <span className="material-symbols-outlined" aria-hidden="true">format_quote</span>
        <span>Trích đoạn</span>
      </button>
      {viewerUrl && <button className="citation-drawer__action-btn" type="button" onClick={() => setViewMode(viewMode === 'PDF' ? 'READER' : 'PDF')}>
        <span className="material-symbols-outlined" aria-hidden="true">picture_as_pdf</span>
        <span>Xem PDF</span>
      </button>}
      {blobUrl && <a className="citation-drawer__action-btn" href={blobUrl} download={citation.fileName}>
        <span className="material-symbols-outlined" aria-hidden="true">download</span>
        <span>Tải tài liệu</span>
      </a>}
      <button className="citation-drawer__close-btn" type="button" onClick={onClose} aria-label="Đóng trích dẫn">
        <span className="material-symbols-outlined" aria-hidden="true">close</span>
        <span>Đóng</span>
      </button>
    </div></div>
    <div className="citation-drawer__body">
      {fileLoading && <p role="status">Đang kiểm tra quyền và tải tài liệu…</p>}
      {fileError && <p role="alert">{fileError}</p>}
      {viewMode === 'PDF' && viewerUrl ? <iframe src={viewerUrl} title={`Tài liệu ${citation.fileName}`} className="citation-drawer__iframe" />
        : <div ref={excerptRef} className="citation-drawer__highlight-container">
          <div className="citation-drawer__highlight-badge">{citation.locator}</div>
          <blockquote className="citation-drawer__highlight-body">{citation.excerpt}</blockquote>
        </div>}
    </div>
  </aside>;
}
