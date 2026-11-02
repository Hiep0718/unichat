/**
 * What a document's state means to the person reading the list.
 *
 * The table used to print the pipeline's own vocabulary — "Vector DB Ready",
 * "Tách Vector...", "Lỗi Vector", "Chưa nạp Vector" — which names the machinery
 * rather than the thing the reader wants to know: can the assistant use this
 * file yet? These say that instead. Every state keeps its own answer: a file
 * that failed is not a file that is still working.
 */
import type { DocumentResponse, DocumentStatus } from './document-api';

/** How a state should read: settled, working, or needing attention. */
export type StatusTone = 'ready' | 'working' | 'blocked';

export interface StatusPresentation {
  readonly label: string;
  readonly tone: StatusTone;
}

const PRESENTATION: Record<DocumentStatus, StatusPresentation> = {
  PROCESSED: { label: 'Sẵn sàng cho AI', tone: 'ready' },
  PROCESSING: { label: 'Đang xử lý', tone: 'working' },
  PENDING: { label: 'Chờ xử lý', tone: 'working' },
  DELETING: { label: 'Đang xoá', tone: 'working' },
  PENDING_APPROVAL: { label: 'Chờ duyệt', tone: 'working' },
  FAILED: { label: 'Lỗi xử lý', tone: 'blocked' },
  REJECTED: { label: 'Bị từ chối', tone: 'blocked' },
};

/** A state the client has not been taught, shown as itself rather than hidden. */
const UNKNOWN: StatusPresentation = { label: 'Không rõ', tone: 'blocked' };

/**
 * The label and tone for one document's state.
 *
 * @param status the state as the Core API reports it
 * @returns how to show it; an unrecognised state reads as "Không rõ" rather
 *          than being silently treated as ready
 */
export function presentStatus(status: DocumentStatus): StatusPresentation {
  return PRESENTATION[status] ?? UNKNOWN;
}

/** Whether the assistant can draw on this document right now. */
export function isReadyForAssistant(status: DocumentStatus): boolean {
  return status === 'PROCESSED';
}

/**
 * How many of a group's files the assistant can actually read.
 *
 * <p>Counted here rather than asked of the server: this list is already loaded,
 * and a file still being ingested is not one the assistant can use, so the
 * total alone would overstate what it knows.
 *
 * @param documents the group's files as currently loaded
 * @returns the ready count and the total, both zero for an empty list
 */
export function countReady(documents: readonly DocumentResponse[]): {
  readonly ready: number;
  readonly total: number;
} {
  const ready = documents.filter((doc) => isReadyForAssistant(doc.status)).length;
  return { ready, total: documents.length };
}

/**
 * The names that more than one file in the group carries.
 *
 * <p>Two files of the same name are not an error — a re-upload is a normal
 * thing to do — but a reader choosing which to delete cannot tell them apart,
 * so the rows say which names are shared.
 *
 * @param documents the group's files as currently loaded
 * @returns the duplicated names, compared case-insensitively after trimming
 */
export function duplicatedNames(documents: readonly DocumentResponse[]): ReadonlySet<string> {
  const seen = new Map<string, number>();
  for (const doc of documents) {
    const key = doc.originalName.trim().toLowerCase();
    seen.set(key, (seen.get(key) ?? 0) + 1);
  }

  const repeated = new Set<string>();
  for (const [key, count] of seen) {
    if (count > 1) repeated.add(key);
  }
  return repeated;
}

/** Whether this document's name is one that another file also uses. */
export function isDuplicatedName(
  name: string,
  duplicates: ReadonlySet<string>,
): boolean {
  return duplicates.has(name.trim().toLowerCase());
}

/**
 * The short kind shown beside a file's name, such as "PDF".
 *
 * @param mediaType the MIME type the server reported
 * @returns an upper-case subtype, or the whole type when it has no subtype
 */
export function fileKind(mediaType: string): string {
  const subtype = mediaType.split('/')[1];
  if (!subtype) return mediaType.toUpperCase();
  // "vnd.openxmlformats-officedocument.wordprocessingml.document" says DOCX to
  // nobody; the tail after the last dot is the part a reader recognises.
  const tail = subtype.split('.').pop() ?? subtype;
  if (tail === 'document') return 'DOCX';
  if (tail === 'plain') return 'TXT';
  return tail.toUpperCase();
}
