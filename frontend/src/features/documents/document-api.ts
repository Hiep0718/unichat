/**
 * Document API client functions.
 * Integrates with Core API document endpoints via fetchJson.
 *
 * @see api-contracts.md §4 (Tài liệu)
 */

import { fetchJson, getAccessToken, getApiBaseUrl } from '../../lib/api-client';

export type DocumentStatus =
  | 'PENDING_APPROVAL'
  | 'REJECTED'
  | 'PENDING'
  | 'PROCESSING'
  | 'PROCESSED'
  | 'FAILED'
  | 'DELETING';

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
  /** Member who contributed the document. */
  uploadedBy: string | null;
  /** Contributor email, resolved on moderation screens. */
  uploadedByEmail: string | null;
  /** Owner or editor who decided on the contribution. */
  approvedBy: string | null;
  approvedAt: string | null;
  /** Reason shown to the contributor when declined. */
  rejectionReason: string | null;
  /** What the contributor said the document contains. */
  contributionSummary: string | null;
  /** Why the contributor says the workspace needs it. */
  contributionReason: string | null;
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

/**
 * Explains a contributed document to whoever reviews it. Required when the
 * uploader cannot publish directly.
 */
export interface ContributionContext {
  /** What the document contains. */
  summary: string;
  /** Why the workspace needs it. */
  reason: string;
}

export async function uploadWorkspaceDocument(
  workspaceId: string,
  file: File,
  onProgress?: (percent: number) => void,
  contribution?: ContributionContext
): Promise<IngestionJobResponse> {
  const formData = new FormData();
  formData.append('file', file);
  if (contribution) {
    formData.append('contributionSummary', contribution.summary);
    formData.append('contributionReason', contribution.reason);
  }

  const token = getAccessToken();

  return new Promise<IngestionJobResponse>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    const baseUrl = getApiBaseUrl();
    xhr.open('POST', `${baseUrl}/api/v1/workspaces/${workspaceId}/documents`);

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
          resolve(Array.isArray(data) ? data[0] : data);
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

export async function uploadWorkspaceDocuments(
  workspaceId: string,
  files: File[],
  onProgressPerFile?: (fileIndex: number, percent: number) => void,
  contribution?: ContributionContext
): Promise<IngestionJobResponse[]> {
  if (!files || files.length === 0) {
    throw new Error('Không có tệp nào được chọn');
  }

  const results: IngestionJobResponse[] = [];

  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    if (!file) continue;

    const res = await uploadWorkspaceDocument(
      workspaceId,
      file,
      (percent) => {
        if (onProgressPerFile) {
          onProgressPerFile(i, percent);
        }
      },
      contribution
    );

    results.push(res);
  }

  return results;
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

/* ---------- Contribution approval ---------- */

/**
 * Lists member contributions awaiting an owner/editor decision.
 * Requires OWNER or EDITOR role in the workspace.
 */
export async function fetchPendingApprovals(
  workspaceId: string,
  page = 0,
  size = 20
): Promise<PageResponse<DocumentResponse>> {
  return fetchJson<PageResponse<DocumentResponse>>(
    `/workspaces/${workspaceId}/documents/pending-approval?page=${page}&size=${size}`
  );
}

/**
 * Returns how many contributions are awaiting a decision, for the tab badge.
 */
export async function fetchPendingApprovalCount(
  workspaceId: string
): Promise<{ pendingCount: number }> {
  return fetchJson<{ pendingCount: number }>(
    `/workspaces/${workspaceId}/documents/pending-approval/count`
  );
}

/**
 * Approves a contribution, releasing it into the ingestion pipeline so it
 * becomes retrievable by the AI.
 */
export async function approveDocument(
  workspaceId: string,
  documentId: string
): Promise<DocumentResponse> {
  return fetchJson<DocumentResponse>(
    `/workspaces/${workspaceId}/documents/${documentId}/approve`,
    { method: 'POST' }
  );
}

/**
 * Declines a contribution. It stays out of retrieval and the contributor sees
 * the reason.
 */
export async function rejectDocument(
  workspaceId: string,
  documentId: string,
  reason: string
): Promise<DocumentResponse> {
  return fetchJson<DocumentResponse>(
    `/workspaces/${workspaceId}/documents/${documentId}/reject`,
    { method: 'POST', body: JSON.stringify({ reason }) }
  );
}

export interface VectorSyncStatusResponse {
  is_syncing: boolean;
  status: 'IDLE' | 'RUNNING' | 'COMPLETED' | 'ERROR';
  current_file: string | null;
  processed_files: number;
  total_files: number;
  processed_chunks: number;
  percent: number;
  message: string;
  last_error: string | null;
}

export interface VectorStatusCheckResponse {
  workspaceId?: string | undefined;
  totalChunksInDb: number;
  workspaceChunksInDb: number;
  isVectorDbReady: boolean;
  message: string;
}

export async function syncVectorStore(): Promise<{ status: string; processed_files: number; total_chunks: number; message?: string }> {
  return fetchJson<{ status: string; processed_files: number; total_chunks: number; message?: string }>('/internal/v1/eval/sync-storage', {
    method: 'POST',
  });
}

export async function fetchVectorSyncStatus(): Promise<VectorSyncStatusResponse> {
  return fetchJson<VectorSyncStatusResponse>('/internal/v1/eval/sync-status');
}

export async function fetchVectorStatusCheck(workspaceId?: string): Promise<VectorStatusCheckResponse> {
  const query = workspaceId ? `?workspaceId=${workspaceId}` : '';
  return fetchJson<VectorStatusCheckResponse>(`/internal/v1/eval/vector-status${query}`);
}

export const getDocuments = (workspaceId: string, page = 0, size = 20): Promise<DocumentResponse[]> =>
  fetchWorkspaceDocuments(workspaceId, page, size).then((res) => res.content);

export const deleteDocument = deleteWorkspaceDocument;
