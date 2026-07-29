import { fetchJson } from '../../lib/api-client';

export type DocumentStatus = 'PENDING' | 'PROCESSING' | 'PROCESSED' | 'FAILED' | 'DELETING';

export interface DocumentResponse {
  id: string;
  workspaceId: string;
  storageKey: string;
  originalName: string;
  mediaType: string;
  byteSize: number;
  sha256: string;
  status: DocumentStatus;
  ingestionVersion: number;
  pageOrBlockCount: number;
  version: number;
  createdAt: string;
  updatedAt: string;
}

export interface PageResponse<T> {
  content: T[];
  totalElements: number;
  totalPages: number;
  number: number;
  size: number;
}

export interface IngestionJobResponse {
  documentId: string;
  jobId: string;
  status: DocumentStatus;
  message: string;
}

export async function fetchWorkspaceDocuments(
  workspaceId: string,
  page = 0,
  size = 20
): Promise<PageResponse<DocumentResponse>> {
  return fetchJson<PageResponse<DocumentResponse>>(`/workspaces/${workspaceId}/documents?page=${page}&size=${size}`);
}

export async function uploadWorkspaceDocument(
  workspaceId: string,
  file: File
): Promise<IngestionJobResponse> {
  const formData = new FormData();
  formData.append('file', file);

  const token = localStorage.getItem('accessToken');
  const response = await fetch(`/api/v1/workspaces/${workspaceId}/documents`, {
    method: 'POST',
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: formData,
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.detail || errorData.title || 'Lỗi khi tải lên tài liệu');
  }

  return response.json();
}

export async function fetchIngestionJobStatus(
  workspaceId: string,
  documentId: string
): Promise<IngestionJobResponse> {
  return fetchJson<IngestionJobResponse>(`/workspaces/${workspaceId}/documents/${documentId}/jobs`);
}

export async function deleteWorkspaceDocument(workspaceId: string, documentId: string): Promise<void> {
  return fetchJson<void>(`/workspaces/${workspaceId}/documents/${documentId}`, {
    method: 'DELETE',
  });
}
