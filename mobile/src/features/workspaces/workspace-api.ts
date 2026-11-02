import { fetchJson } from '../../lib/api-client';
import {
  WorkspaceItem,
  WorkspaceDetail,
  DocumentItem,
  GroupMember,
  PageResponse,
  CreateWorkspacePayload,
} from './workspace-types';

import type { FeedPost } from '../feed/feed-types';

/**
 * Trình bày một bài của nhóm theo đúng hình dạng thẻ bài viết đang chờ.
 *
 * <p>Hai endpoint mang cùng một bài dưới những cái tên hơi khác nhau, nên ở đây
 * ánh xạ thay vì nhân đôi thẻ: dùng chung một component nghĩa là nền bài viết,
 * tệp đính kèm và bình luận hoạt động y hệt nhau ở nhóm và ở bảng tin, bởi vì
 * đó đúng là cùng một đoạn mã đang vẽ.
 */
function toFeedPost(raw: Record<string, any>): FeedPost {
  return {
    id: raw.id,
    workspaceId: raw.workspaceId,
    workspaceName: raw.workspaceName ?? '',
    authorId: raw.authorId,
    authorName: raw.authorName,
    authorAvatar: raw.authorAvatar ?? null,
    title: raw.title,
    body: raw.body,
    label: (raw.label ?? 'DISCUSSION') as FeedPost['label'],
    voteScore: raw.voteScore ?? 0,
    replyCount: raw.replyCount ?? 0,
    reactions: raw.reactions ?? { counts: {}, total: 0, myReaction: null },
    backgroundKey: raw.backgroundKey ?? null,
    acceptedReplyId: raw.acceptedReplyId ?? null,
    // Lưu bài là khái niệm của bảng tin; danh sách của nhóm không hiện cũng
    // không đặt được nó.
    isBookmarked: false,
    createdAt: raw.createdAt,
    attachments: raw.attachments ?? [],
    hasAiAnswer: Boolean(raw.hasAiAnswer),
    pinned: Boolean(raw.pinned),
  };
}

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
   * Thành viên đang hoạt động của một nhóm.
   *
   * <p>Core API chỉ trả danh sách này cho chủ sở hữu; với vai trò khác nó từ
   * chối, nên nơi gọi phải tự quyết có hỏi hay không thay vì nuốt lỗi.
   *
   * @param workspaceId nhóm cần đọc
   * @returns thành viên kèm nhận dạng để vẽ avatar
   */
  async getWorkspaceMembers(workspaceId: string): Promise<GroupMember[]> {
    return fetchJson<GroupMember[]>(`/workspaces/${workspaceId}/members`);
  },

  /**
   * Bài viết trong một nhóm.
   *
   * @param workspaceId nhóm cần đọc
   * @param params phân trang, lọc theo nhãn và thứ tự sắp xếp
   * @returns một trang bài viết; `label` bỏ trống nghĩa là mọi loại
   */
  async getWorkspacePosts(
    workspaceId: string,
    params: PaginationParams & { label?: string; sort?: 'NEW' | 'HOT' } = {}
  ): Promise<PageResponse<FeedPost>> {
    const page = params.page ?? 0;
    const size = params.size ?? 20;
    const query = new URLSearchParams({
      page: String(page),
      size: String(size),
      sort: params.sort ?? 'NEW',
    });
    if (params.label) query.set('label', params.label);

    const res = await fetchJson<PageResponse<Record<string, unknown>>>(
      `/workspaces/${workspaceId}/discussions?${query.toString()}`
    );
    // Một phản hồi thiếu mảng content thì danh sách rỗng, không phải lỗi.
    return { ...res, content: (res?.content ?? []).map(toFeedPost) };
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
