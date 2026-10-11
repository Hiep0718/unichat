import { fetchJson } from '../../lib/api-client';
import {
  WorkspaceItem,
  WorkspaceDetail,
  DocumentItem,
  PageResponse,
  CreateWorkspacePayload,
} from './workspace-types';

export interface PaginationParams {
  page?: number;
  size?: number;
}

/**
 * Workspace API service client.
 * Strictly communicates with Core API endpoints adhering to api-contracts.md.
 */
export const workspaceApi = {
  /**
   * Fetch current user's joined/owned workspaces.
   */
  async getWorkspaces(params: PaginationParams = {}): Promise<PageResponse<WorkspaceItem>> {
    const page = params.page ?? 0;
    const size = params.size ?? 20;
    return fetchJson<PageResponse<WorkspaceItem>>(
      `/workspaces?page=${page}&size=${size}`
    );
  },

  /**
   * Fetch public workspaces available for discovery and joining.
   */
  async getExploreWorkspaces(params: PaginationParams = {}): Promise<PageResponse<WorkspaceItem>> {
    const page = params.page ?? 0;
    const size = params.size ?? 20;
    return fetchJson<PageResponse<WorkspaceItem>>(
      `/workspaces/explore?page=${page}&size=${size}`
    );
  },

  /**
   * Get single workspace details.
   */
  async getWorkspace(id: string): Promise<WorkspaceDetail> {
    return fetchJson<WorkspaceDetail>(`/workspaces/${id}`);
  },

  /**
   * Create a new workspace.
   */
  async createWorkspace(payload: CreateWorkspacePayload): Promise<WorkspaceItem> {
    return fetchJson<WorkspaceItem>('/workspaces', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  /**
   * Join a public or shared workspace.
   */
  async joinWorkspace(id: string): Promise<{ success: boolean; message?: string }> {
    return fetchJson<{ success: boolean; message?: string }>(`/workspaces/${id}/join`, {
      method: 'POST',
    });
  },

  /**
   * Delete a workspace (owner only).
   */
  async deleteWorkspace(id: string): Promise<void> {
    await fetchJson<void>(`/workspaces/${id}`, {
      method: 'DELETE',
    });
  },

  /**
   * Fetch documents inside a workspace.
   */
  async getWorkspaceDocuments(
    workspaceId: string,
    params: PaginationParams = {}
  ): Promise<PageResponse<DocumentItem>> {
    const page = params.page ?? 0;
    const size = params.size ?? 20;
    const res = await fetchJson<PageResponse<any>>(
      `/workspaces/${workspaceId}/documents?page=${page}&size=${size}`
    );
    const content = (res.content || []).map((doc: any) => ({
      ...doc,
      id: doc.id,
      name: doc.name || doc.originalName || 'Tài liệu',
      originalFileName: doc.originalFileName || doc.originalName,
      mimeType: doc.mimeType || doc.mediaType || 'application/octet-stream',
      fileSizeBytes: doc.fileSizeBytes ?? doc.byteSize ?? 0,
      status: doc.status,
      chunkCount: doc.chunkCount ?? doc.pageOrBlockCount ?? 0,
      createdAt: doc.createdAt,
      failureReason: doc.failureReason || doc.rejectionReason,
    }));
    return { ...res, content };
  },

  /**
   * Upload a document via multipart/form-data.
   */
  async uploadDocument(
    workspaceId: string,
    file: { uri: string; name: string; type: string }
  ): Promise<DocumentItem> {
    const formData = new FormData();
    formData.append('file', {
      uri: file.uri,
      name: file.name,
      type: file.type || 'application/octet-stream',
    } as any);

    return fetchJson<DocumentItem>(`/workspaces/${workspaceId}/documents`, {
      method: 'POST',
      body: formData,
    });
  },

  /**
   * Delete a document from a workspace.
   */
  async deleteDocument(workspaceId: string, documentId: string): Promise<void> {
    await fetchJson<void>(`/workspaces/${workspaceId}/documents/${documentId}`, {
      method: 'DELETE',
    });
  },
};
