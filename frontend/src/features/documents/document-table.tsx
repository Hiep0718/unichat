/**
 * Document table with search, type filter, and action buttons.
 * Displays documents in a high-density table matching DESIGN.md §Components.
 */

import { useCallback, useMemo, useState } from 'react';

import { Icon } from '../../components/icon';

import type { DocumentDto, DocumentMediaType } from './document-schema';

import './document-table.css';

interface DocumentTableProps {
  readonly documents: readonly DocumentDto[];
  readonly isLoading: boolean;
  readonly onDelete: (documentId: string) => void;
}

type TypeFilter = 'ALL' | DocumentMediaType;

const TYPE_FILTERS: readonly { value: TypeFilter; label: string }[] = [
  { value: 'ALL', label: 'Tất cả' },
  { value: 'PDF', label: 'PDF' },
  { value: 'DOCX', label: 'DOCX' },
  { value: 'TXT', label: 'TXT' },
];

const TYPE_ICON_MAP: Record<DocumentMediaType, string> = {
  PDF: 'picture_as_pdf',
  DOCX: 'article',
  TXT: 'text_snippet',
};

/** Formats byte size to human-readable string. */
function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1_048_576) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / 1_048_576).toFixed(1)} MB`;
}

/** Formats ISO date string to localized display. */
function formatDate(isoDate: string): string {
  const date = new Date(isoDate);
  const now = new Date();
  const isToday = date.toDateString() === now.toDateString();

  if (isToday) {
    return `Hôm nay, ${date.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}`;
  }
  return date.toLocaleDateString('vi-VN', {
    day: '2-digit', month: '2-digit', year: 'numeric',
  });
}

/**
 * Renders the document data table with search, filters, and row actions.
 */
export function DocumentTable({
  documents,
  isLoading,
  onDelete,
}: DocumentTableProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<TypeFilter>('ALL');

  const handleSearch = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => setSearchQuery(e.target.value),
    [],
  );

  const filtered = useMemo(() => {
    const query = searchQuery.toLowerCase().trim();
    return documents.filter((doc) => {
      const matchesType = activeFilter === 'ALL' || doc.mediaType === activeFilter;
      const matchesSearch = !query || doc.originalName.toLowerCase().includes(query);
      return matchesType && matchesSearch;
    });
  }, [documents, searchQuery, activeFilter]);

  return (
    <div className="doc-table-container">
      <div className="doc-table__toolbar">
        <div className="doc-table__search">
          <Icon name="search" size={20} className="doc-table__search-icon" />
          <input
            id="document-search"
            className="doc-table__search-input"
            type="text"
            placeholder="Tìm kiếm tài liệu..."
            value={searchQuery}
            onChange={handleSearch}
          />
        </div>

        <div className="doc-table__filters">
          <span className="doc-table__filter-label">Lọc theo:</span>
          {TYPE_FILTERS.map((f) => (
            <button
              key={f.value}
              className={`doc-table__filter-btn ${activeFilter === f.value ? 'doc-table__filter-btn--active' : ''}`}
              type="button"
              onClick={() => setActiveFilter(f.value)}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {isLoading && <TableSkeleton />}

      {!isLoading && filtered.length === 0 && (
        <div className="doc-table__empty">
          <Icon name="folder_open" size={48} />
          <p>
            {searchQuery || activeFilter !== 'ALL'
              ? 'Không tìm thấy tài liệu phù hợp.'
              : 'Chưa có tài liệu nào. Hãy upload tài liệu đầu tiên.'}
          </p>
        </div>
      )}

      {!isLoading && filtered.length > 0 && (
        <div className="doc-table__wrapper">
          <table className="doc-table">
            <thead>
              <tr>
                <th className="doc-table__th">Tên file</th>
                <th className="doc-table__th">Loại</th>
                <th className="doc-table__th">Dung lượng</th>
                <th className="doc-table__th">Trạng thái</th>
                <th className="doc-table__th">Ngày upload</th>
                <th className="doc-table__th doc-table__th--actions">Hành động</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((doc) => (
                <DocumentRow key={doc.id} doc={doc} onDelete={onDelete} />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

/* ─── Sub-components ─────────────────────────────────────────── */

function DocumentRow({
  doc,
  onDelete,
}: {
  readonly doc: DocumentDto;
  readonly onDelete: (id: string) => void;
}) {
  return (
    <tr className="doc-table__row">
      <td className="doc-table__td doc-table__td--name">
        <Icon
          name={TYPE_ICON_MAP[doc.mediaType]}
          size={20}
          className={`doc-table__file-icon doc-table__file-icon--${doc.mediaType.toLowerCase()}`}
        />
        <span className="doc-table__filename" title={doc.originalName}>
          {doc.originalName}
        </span>
      </td>
      <td className="doc-table__td">{doc.mediaType}</td>
      <td className="doc-table__td">{formatFileSize(doc.byteSize)}</td>
      <td className="doc-table__td">
        <StatusBadge status={doc.status} progress={doc.processingProgress} />
      </td>
      <td className="doc-table__td">{formatDate(doc.createdAt)}</td>
      <td className="doc-table__td doc-table__td--actions">
        <button
          className="doc-table__action-btn"
          type="button"
          title="Tải xuống"
          aria-label={`Tải xuống ${doc.originalName}`}
        >
          <Icon name="download" size={18} />
        </button>
        <button
          className="doc-table__action-btn doc-table__action-btn--danger"
          type="button"
          title="Xóa tài liệu"
          aria-label={`Xóa ${doc.originalName}`}
          onClick={() => onDelete(doc.id)}
        >
          <Icon name="delete" size={18} />
        </button>
      </td>
    </tr>
  );
}

function StatusBadge({
  status,
  progress,
}: {
  readonly status: DocumentDto['status'];
  readonly progress: number | null;
}) {
  const config = STATUS_CONFIG[status];

  return (
    <span className={`doc-table__status ${config.className}`}>
      {status === 'PROCESSING' && progress !== null ? (
        <>
          <span className="doc-table__status-text">{config.label}</span>
          <span className="doc-table__status-progress">{progress}%</span>
        </>
      ) : (
        <>
          <span className="doc-table__status-dot" />
          {config.label}
        </>
      )}
    </span>
  );
}

const STATUS_CONFIG: Record<
  DocumentDto['status'],
  { label: string; className: string }
> = {
  PROCESSED: { label: 'Processed', className: 'doc-table__status--success' },
  PROCESSING: { label: 'Processing', className: 'doc-table__status--warning' },
  PENDING: { label: 'Pending', className: 'doc-table__status--pending' },
  FAILED: { label: 'Failed', className: 'doc-table__status--error' },
  DELETING: { label: 'Deleting', className: 'doc-table__status--pending' },
};

function TableSkeleton() {
  return (
    <div className="doc-table__skeleton">
      {Array.from({ length: 3 }, (_, i) => (
        <div key={i} className="doc-table__skeleton-row">
          <div className="doc-table__skeleton-cell doc-table__skeleton-cell--wide" />
          <div className="doc-table__skeleton-cell" />
          <div className="doc-table__skeleton-cell" />
          <div className="doc-table__skeleton-cell" />
          <div className="doc-table__skeleton-cell" />
        </div>
      ))}
    </div>
  );
}
