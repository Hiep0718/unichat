/**
 * Documents feature — public API barrel.
 */
export { DocumentTable } from './document-table';
export { useDocuments, useDeleteDocument } from './document-hooks';
export type {
  DocumentDto,
  DocumentStatus,
  DocumentMediaType,
} from './document-schema';
