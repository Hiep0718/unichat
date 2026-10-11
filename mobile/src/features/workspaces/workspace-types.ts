export interface WorkspaceItem {
  id: string;
  name: string;
  description?: string;
  visibility: 'PUBLIC' | 'PRIVATE' | 'SHARED';
  documentCount: number;
  memberCount: number;
  userRole?: 'OWNER' | 'ADMIN' | 'MEMBER' | 'VIEWER' | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface WorkspaceDetail extends WorkspaceItem {
  ownerEmail?: string;
  isOwner?: boolean;
}

export interface DocumentItem {
  id: string;
  name: string;
  originalFileName?: string;
  mimeType: string;
  fileSizeBytes: number;
  status: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED';
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
