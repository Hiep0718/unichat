/**
 * Document API client functions.
 * Uses mock data until backend Document API is implemented.
 *
 * @see api-contracts.md §4 (Tài liệu)
 */

import type { DocumentDto } from './document-schema';

/**
 * Mock documents for development.
 * Will be replaced by real API calls to GET /workspaces/{workspaceId}/documents.
 */
const MOCK_DOCUMENTS: readonly DocumentDto[] = [
  {
    id: 'doc-001',
    workspaceId: 'ws-mock',
    originalName: 'giao-trinh-tri-tue-nhan-tao.pdf',
    mediaType: 'PDF',
    byteSize: 4_404_019,
    status: 'PROCESSED',
    processingProgress: null,
    createdAt: '2023-10-10T07:00:00Z',
    updatedAt: '2023-10-10T07:05:00Z',
  },
  {
    id: 'doc-002',
    workspaceId: 'ws-mock',
    originalName: 'srs-unichat.docx',
    mediaType: 'DOCX',
    byteSize: 1_153_434,
    status: 'PROCESSING',
    processingProgress: 45,
    createdAt: '2023-10-10T14:30:00Z',
    updatedAt: '2023-10-10T14:30:00Z',
  },
  {
    id: 'doc-003',
    workspaceId: 'ws-mock',
    originalName: 'tai-lieu-rag-co-ban.txt',
    mediaType: 'TXT',
    byteSize: 46_080,
    status: 'PROCESSED',
    processingProgress: null,
    createdAt: '2023-10-05T09:00:00Z',
    updatedAt: '2023-10-05T09:02:00Z',
  },
];

/**
 * Fetches documents for a workspace.
 * Currently returns mock data; will call GET /workspaces/{workspaceId}/documents.
 */
export function getDocuments(
  workspaceId: string,
): Promise<readonly DocumentDto[]> {
  void workspaceId; // Will be used in real API call
  return Promise.resolve(MOCK_DOCUMENTS);
}

/**
 * Deletes a document by ID.
 * Currently a no-op; will call DELETE /workspaces/{workspaceId}/documents/{documentId}.
 */
export function deleteDocument(
  workspaceId: string,
  documentId: string,
): Promise<void> {
  void workspaceId; // Will be used in real API call
  void documentId;
  return Promise.resolve();
}
