/**
 * Where a member adds files to a group.
 *
 * Split out of the table: dragging, picking and the copy explaining what the
 * pipeline accepts are one concern, and the table's own file was already twice
 * the length this project allows.
 */
import { useRef, useState } from 'react';

import { Icon } from '../../../components/icon';

import './document-upload-zone.css';

/** What the Core API accepts, so a wrong pick fails in the picker. */
const ACCEPTED = '.pdf,.docx,.txt';

interface DocumentUploadZoneProps {
  /** Blocks interaction and says what is happening while files go up. */
  readonly isUploading: boolean;
  readonly uploadingCount: number;
  /**
   * Whether this member's files become sources at once. A contributor without
   * edit rights has theirs held for approval, which the copy says plainly.
   */
  readonly canEdit: boolean;
  readonly onFiles: (files: File[]) => void;
}

export function DocumentUploadZone({
  isUploading,
  uploadingCount,
  canEdit,
  onFiles,
}: DocumentUploadZoneProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setDragging] = useState(false);

  const take = (list: FileList | null) => {
    const files = Array.from(list ?? []);
    if (files.length > 0) onFiles(files);
  };

  const stop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
  };

  return (
    <div
      className={[
        'doc-drop',
        isDragging ? 'doc-drop--over' : '',
        isUploading ? 'doc-drop--busy' : '',
      ].join(' ').trim()}
      onClick={() => !isUploading && inputRef.current?.click()}
      onDragOver={(e) => { stop(e); if (!isUploading) setDragging(true); }}
      onDragLeave={(e) => { stop(e); setDragging(false); }}
      onDrop={(e) => {
        stop(e);
        setDragging(false);
        if (!isUploading) take(e.dataTransfer.files);
      }}
      role="button"
      tabIndex={isUploading ? -1 : 0}
      aria-disabled={isUploading}
      aria-label="Tải tệp lên"
      onKeyDown={(e) => {
        if (isUploading) return;
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          inputRef.current?.click();
        }
      }}
    >
      <input
        type="file"
        ref={inputRef}
        className="doc-drop__input"
        onChange={(e) => { take(e.target.files); e.target.value = ''; }}
        accept={ACCEPTED}
        multiple
        disabled={isUploading}
        tabIndex={-1}
      />

      <span className="doc-drop__icon">
        <Icon name="upload" size={22} />
      </span>

      <p className="doc-drop__title">
        {isUploading
          ? `Đang tải lên ${uploadingCount} tệp...`
          : 'Kéo thả hoặc bấm để tải tệp lên'}
      </p>

      <p className="doc-drop__hint">
        {/* An editor needs to know what the pipeline can take; a contributor
            needs to know their file waits for approval first. */}
        {canEdit
          ? 'PDF, DOCX, TXT · Tải nhiều tệp cùng lúc · PDF trên 20 MB sẽ được tự chia nhỏ'
          : 'PDF, DOCX, TXT · Tệp của bạn chờ chủ nhóm duyệt trước khi trợ lý dùng tới'}
      </p>
    </div>
  );
}
