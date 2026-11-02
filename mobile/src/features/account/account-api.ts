import { fetchAuthorized, fetchJson, getAccessToken, getApiBaseUrl } from '../../lib/api-client';

import type { AvatarColorKey } from './avatar-colours';
import type { UserResponse } from '../../types/api';

/** Tệp ảnh đã chọn, theo đúng hình dạng React Native gắn vào FormData. */
export interface PickedImage {
  readonly uri: string;
  readonly name: string;
  readonly type: string;
}

/** Giới hạn của `SquareImageEncoder` phía Core API. */
export const AVATAR_MAX_BYTES = 2 * 1024 * 1024;

/** Các kiểu ảnh bộ mã hoá phía máy chủ đọc được. */
export const AVATAR_ACCEPTED_TYPES = ['image/png', 'image/jpeg', 'image/webp'] as const;

/**
 * Các thao tác người dùng tự làm với hồ sơ của chính mình.
 *
 * Phản chiếu phần tương ứng trong `frontend/src/features/auth/api/auth-api.ts`;
 * uỷ quyền do Core API quyết định qua JWT, phía này không tự suy luận gì thêm.
 */
export const accountApi = {
  /** Đọc hồ sơ của người đang đăng nhập. */
  getMe: (): Promise<UserResponse> => fetchJson<UserResponse>('/users/me', { method: 'GET' }),

  /** Đổi tên hiển thị. Tên dùng để nhắc (@) không bị ảnh hưởng. */
  updateDisplayName: (displayName: string): Promise<UserResponse> =>
    fetchJson<UserResponse>('/users/me', {
      method: 'PATCH',
      body: JSON.stringify({ displayName }),
    }),

  /** Thay ảnh đại diện. Máy chủ cắt vuông và mã hoá lại thành PNG. */
  uploadAvatar: async (file: PickedImage): Promise<void> => {
    const body = new FormData();
    body.append('file', file as unknown as Blob);
    const response = await fetchAuthorized('/users/me/avatar', { method: 'PUT', body });
    if (!response.ok) {
      throw new Error(`Không tải được ảnh lên (HTTP ${response.status})`);
    }
  },

  /** Gỡ ảnh, quay về avatar chữ cái. */
  removeAvatar: (): Promise<void> => fetchJson<void>('/users/me/avatar', { method: 'DELETE' }),

  /** Chọn màu avatar chữ cái; null là trả về màu suy ra từ tên. */
  chooseAvatarColor: (color: AvatarColorKey | null): Promise<void> =>
    fetchJson<void>(`/users/me/avatar-color${color ? `?color=${color}` : ''}`, {
      method: 'PATCH',
    }),
};

/**
 * Nguồn ảnh đại diện cho `<Image>`.
 *
 * Endpoint cần Authorization nên URL trần không dùng được; `version` là tham
 * số phá bộ nhớ đệm, vì máy chủ trả `private, max-age=300` và nếu thiếu nó thì
 * ảnh cũ còn hiện suốt năm phút sau khi người dùng vừa đổi.
 */
export function avatarSource(userId: string, version: number) {
  const token = getAccessToken();
  return {
    uri: `${getApiBaseUrl()}/api/v1/users/${userId}/avatar?v=${version}`,
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
  };
}
