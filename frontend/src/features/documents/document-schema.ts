/**
 * Document data types matching Core API DocumentResponse DTO.
 * Aligned with data-model.md §2 (documents table).
 */

/** Document processing status matching backend enum. */
export type DocumentStatus =
  /** Contributed by a member; awaiting owner/editor approval. Not retrievable. */
  | 'PENDING_APPROVAL'
  /** Contribution declined by an owner/editor. Not retrievable. */
  | 'REJECTED'
  | 'PENDING'
  | 'PROCESSING'
  | 'PROCESSED'
  | 'FAILED'
  | 'DELETING';

/** Supported document media types. */
export type DocumentMediaType = 'PDF' | 'DOCX' | 'TXT';

/** Document data returned from the API. */
export interface DocumentDto {
  readonly id: string;
  readonly workspaceId: string;
  readonly originalName: string;
  readonly mediaType: DocumentMediaType;
  readonly byteSize: number;
  readonly status: DocumentStatus;
  readonly processingProgress: number | null;
  readonly createdAt: string;
  readonly updatedAt: string;
}
