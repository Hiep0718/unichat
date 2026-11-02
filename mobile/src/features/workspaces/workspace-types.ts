export type WorkspaceRole = 'OWNER' | 'EDITOR' | 'VIEWER';

/** Một thành viên như danh sách vẽ ra họ. */
export interface WorkspaceFace {
  userId: string;
  displayName: string;
  hasAvatar: boolean;
  avatarColor: string | null;
}

export interface WorkspaceItem {
  id: string;
  name: string;
  description?: string;
  visibility: 'PUBLIC' | 'PRIVATE' | 'SHARED';
  documentCount: number;
  memberCount: number;
  /** Mọi bài còn sống của nhóm; con số mà huy hiệu cạnh tab "Bài viết" đếm. */
  postCount?: number;
  /** Vài thành viên để vẽ thành avatar, chủ sở hữu trước. */
  faces?: WorkspaceFace[];
  /** True khi nhóm đã có ảnh bìa riêng; nếu không thì vẽ bìa mặc định. */
  hasCover?: boolean;
  /** Vai trò của người đang xem; Core API chỉ có ba giá trị này. */
  userRole?: WorkspaceRole | null;
  /**
   * What the group is about. Empty for groups created before topics, and for
   * owners who skipped the picker; the cover falls back to the hashed set.
   */
  topics?: string[];
  createdAt?: string;
  updatedAt?: string;
}

export interface WorkspaceDetail extends WorkspaceItem {
  ownerEmail?: string;
  isOwner?: boolean;
}

/**
 * Trạng thái của một tài liệu, đúng bộ giá trị Core API gửi về.
 *
 * Trước đây kiểu này khai `'COMPLETED'`, một giá trị **không hề tồn tại** ở
 * phía server; tệp xử lý xong mang `PROCESSED`. Hệ quả là màn Tệp so khớp hụt
 * và mọi tệp đã sẵn sàng đều hiện "Đang chờ".
 */
export type DocumentStatus =
  | 'PENDING_APPROVAL'
  | 'REJECTED'
  | 'PENDING'
  | 'PROCESSING'
  | 'PROCESSED'
  | 'FAILED'
  | 'DELETING';

export interface DocumentItem {
  id: string;
  name: string;
  originalFileName?: string;
  mimeType: string;
  fileSizeBytes: number;
  status: DocumentStatus;
  chunkCount?: number;
  createdAt: string;
  failureReason?: string;
}

export interface PageResponse<T> {
  content: T[];
  totalElements: number;
  totalPages?: number;
  number?: number;
  size?: number;
}

export interface CreateWorkspacePayload {
  name: string;
  description?: string;
  visibility: 'PUBLIC' | 'PRIVATE' | 'SHARED';
}

/** Một thành viên của nhóm, như tab Thành viên vẽ ra họ. */
export interface GroupMember {
  userId: string;
  email: string;
  /** Tên để hiện và để suy chữ cái avatar; null khi chưa phân giải được. */
  displayName: string | null;
  /** Có ảnh đại diện để tải về hay vẽ chữ cái. */
  hasAvatar: boolean;
  /** Màu avatar chữ cái đã chọn, null thì suy từ tên. */
  avatarColor: string | null;
  role: WorkspaceRole;
  status: 'ACTIVE' | 'REVOKED';
  /** Ai mời họ; null với tư cách thành viên không do ai mời. */
  invitedById: string | null;
}

/** Nhãn phân loại bài viết, đúng bộ giá trị Core API nhận. */
export type GroupPostLabel = 'QUESTION' | 'DISCUSSION' | 'ANNOUNCEMENT';
