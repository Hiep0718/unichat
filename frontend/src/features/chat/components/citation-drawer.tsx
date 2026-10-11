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
      <button type="button" onClick={() => { setViewMode('READER'); excerptRef.current?.scrollIntoView({ block: 'center' }); }}>Trích đoạn</button>
      {viewerUrl && <button type="button" onClick={() => setViewMode(viewMode === 'PDF' ? 'READER' : 'PDF')}>Xem PDF</button>}
      {blobUrl && <a href={blobUrl} download={citation.fileName}>Tải tài liệu</a>}
      <button type="button" onClick={onClose} aria-label="Đóng trích dẫn">Đóng</button>
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
