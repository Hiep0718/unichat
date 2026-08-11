/**
 * Document API client functions.
 * Integrates with Core API document endpoints via fetchJson.
 *
 * @see api-contracts.md §4 (Tài liệu)
 */

import { fetchJson, getAccessToken } from '../../lib/api-client';

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
  file: File,
  onProgress?: (percent: number) => void
): Promise<IngestionJobResponse> {
  const formData = new FormData();
  formData.append('file', file);

  const token = getAccessToken();

  return new Promise<IngestionJobResponse>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('POST', `/api/v1/workspaces/${workspaceId}/documents`);

    if (token) {
      xhr.setRequestHeader('Authorization', `Bearer ${token}`);
    }

    if (xhr.upload && onProgress) {
      xhr.upload.onprogress = (event) => {
        if (event.lengthComputable) {
          const percent = Math.round((event.loaded / event.total) * 100);
          onProgress(percent);
        }
      };
    }

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          const data = JSON.parse(xhr.responseText);
          resolve(data);
        } catch {
          reject(new Error('Phản hồi từ máy chủ không hợp lệ'));
        }
      } else {
        try {
          const errorData = JSON.parse(xhr.responseText);
          reject(new Error(errorData.detail || errorData.title || 'Lỗi khi tải lên tài liệu'));
        } catch {
          reject(new Error(`Tải lên thất bại với mã lỗi HTTP ${xhr.status}`));
        }
      }
    };

    xhr.onerror = () => reject(new Error('Lỗi kết nối mạng khi tải lên tài liệu'));
    xhr.send(formData);
  });
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

export const getDocuments = (workspaceId: string, page = 0, size = 20): Promise<DocumentResponse[]> =>
  fetchWorkspaceDocuments(workspaceId, page, size).then((res) => res.content);

export const deleteDocument = deleteWorkspaceDocument;
