import { fetchJson } from '../../lib/api-client';

export interface ChangePasswordRequest {
  currentPassword?: string;
  newPassword?: string;
}

export const settingsApi = {
  /**
   * Change the current user's password.
   */
  changePassword: (data: ChangePasswordRequest): Promise<void> => {
    return fetchJson('/users/me/password', {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  },
};
