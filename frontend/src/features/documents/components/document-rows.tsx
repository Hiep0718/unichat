/**
 * The group's files, one row each.
 *
 * Three facts per file — what it is, how big, and whether the assistant can use
 * it yet — plus the way to remove it. The table used to carry a separate
 * "Định dạng" column for a word that fits beside the name, and spent its
 * status column on the pipeline's vocabulary.
 */
import { Icon } from '../../../components/icon';
import { formatBytes } from '../../../lib/format-bytes';
import {
  fileKind,
  isDuplicatedName,
  presentStatus,
} from '../document-status';

import type { DocumentResponse } from '../document-api';
import './document-rows.css';

/** A file on its way up, before the server has a row for it. */
export interface UploadingRow {
  readonly id: string;
  readonly name: string;
  readonly size: number;
  readonly mediaType: string;
  readonly progress: number;
}

interface DocumentRowsProps {
  readonly documents: readonly DocumentResponse[];
  readonly uploading: readonly UploadingRow[];
  /** Names more than one file carries, so the rows can say which. */
  readonly duplicates: ReadonlySet<string>;
  readonly canEdit: boolean;
  readonly onDelete: (documentId: string) => void;
}

export function DocumentRows({
  documents,
  uploading,
  duplicates,
  canEdit,
  onDelete,
}: DocumentRowsProps) {
  return (
    <div className="doc-rows">
      <div className="doc-rows__head" aria-hidden="true">
        <span>Tên tệp</span>
        <span className="doc-rows__head-size">Dung lượng</span>
        <span className="doc-rows__head-status">Trạng thái</span>
        {canEdit && <span className="doc-rows__head-action" />}
      </div>

      <ul className="doc-rows__list">
        {uploading.map((doc) => (
          <li key={doc.id} className="doc-row doc-row--uploading">
            <FileName name={doc.name} mediaType={doc.mediaType} />
            <span className="doc-row__size">{formatBytes(doc.size)}</span>
            <span className="doc-row__status">
              <StatusPill label={`Đang tải lên ${doc.progress}%`} tone="working" />
            </span>
            {canEdit && <span className="doc-row__action" />}
            <span
              className="doc-row__progress"
              style={{ width: `${doc.progress}%` }}
              aria-hidden="true"
            />
          </li>
        ))}

        {documents.map((doc) => {
          const shown = presentStatus(doc.status);
          return (
            <li key={doc.id} className="doc-row">
              <FileName
                name={doc.originalName}
                mediaType={doc.mediaType}
                duplicated={isDuplicatedName(doc.originalName, duplicates)}
              />
              <span className="doc-row__size">{formatBytes(doc.byteSize)}</span>
              <span className="doc-row__status">
                <StatusPill label={shown.label} tone={shown.tone} />
              </span>
              {canEdit && (
                <span className="doc-row__action">
                  <button
                    type="button"
                    className="doc-row__delete"
                    onClick={() => onDelete(doc.id)}
                    title="Xoá tệp"
                    aria-label={`Xoá ${doc.originalName}`}
                  >
                    <Icon name="delete" size={18} />
                  </button>
                </span>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}

interface FileNameProps {
  readonly name: string;
  readonly mediaType: string;
  readonly duplicated?: boolean;
}

/** The file's kind, its name, and a warning when the name is not unique. */
function FileName({ name, mediaType, duplicated = false }: FileNameProps) {
  return (
    <span className="doc-row__name">
      <span className="doc-row__kind">{fileKind(mediaType)}</span>
      <span className="doc-row__name-text">
        <span className="doc-row__name-line" title={name}>{name}</span>
        {/* Two files of one name is normal — a re-upload — but someone choosing
            which to delete cannot otherwise tell them apart. */}
        {duplicated && (
          <span className="doc-row__dupe">Trùng tên với một tệp khác</span>
        )}
      </span>
    </span>
  );
}

/** The state of one file, coloured by whether it needs attention. */
function StatusPill({ label, tone }: { readonly label: string; readonly tone: string }) {
  return (
    <span className={`doc-pill doc-pill--${tone}`}>
      <span className="doc-pill__dot" aria-hidden="true" />
      {label}
    </span>
  );
}
