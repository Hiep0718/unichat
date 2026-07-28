import { fetchJson } from '../../lib/api-client';

export type SystemRole = 'USER' | 'ADMIN';
export type UserStatus = 'ACTIVE' | 'LOCKED' | 'PENDING_VERIFICATION';

export interface UserItem {
  id: string;
  email: string;
  systemRole: SystemRole;
  status: UserStatus;
  createdAt: string;
}

export interface PageResponse<T> {
  content: T[];
  totalElements: number;
  totalPages: number;
  number: number;
  size: number;
}

export async function fetchAdminUsers(
  query?: string,
  page = 0,
  size = 20
): Promise<PageResponse<UserItem>> {
  const queryParam = query ? `&query=${encodeURIComponent(query)}` : '';
  return fetchJson<PageResponse<UserItem>>(`/admin/users?page=${page}&size=${size}${queryParam}`);
}

export async function updateAdminUserStatus(
  userId: string,
  status: UserStatus
): Promise<UserItem> {
  return fetchJson<UserItem>(`/admin/users/${userId}/status`, {
    method: 'PATCH',
    body: JSON.stringify({ status }),
  });
}
