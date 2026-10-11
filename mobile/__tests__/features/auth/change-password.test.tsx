import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import ChangePasswordScreen from '../../../app/account/change-password';
import * as apiClient from '../../../src/lib/api-client';
import { ToastProvider } from '../../../src/lib/toast-context';

jest.mock('../../../src/lib/api-client', () => ({
  fetchJson: jest.fn(),
}));

describe('ChangePasswordScreen', () => {
  const mockFetchJson = apiClient.fetchJson as jest.MockedFunction<typeof apiClient.fetchJson>;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders form inputs and submit button', () => {
    const { getByText, getByPlaceholderText } = render(
      <ToastProvider>
        <ChangePasswordScreen />
      </ToastProvider>
    );

    expect(getByText('Cập nhật Mật khẩu')).toBeTruthy();
    expect(getByPlaceholderText('Nhập mật khẩu hiện tại')).toBeTruthy();
    expect(getByPlaceholderText('Tối thiểu 12 ký tự')).toBeTruthy();
    expect(getByPlaceholderText('Nhập lại mật khẩu mới')).toBeTruthy();
    expect(getByText('Lưu mật khẩu mới')).toBeTruthy();
  });

  it('shows error when new password is too short', async () => {
    const { getByText, getByPlaceholderText } = render(
      <ToastProvider>
        <ChangePasswordScreen />
      </ToastProvider>
    );

    fireEvent.changeText(getByPlaceholderText('Nhập mật khẩu hiện tại'), 'oldPassword123');
    fireEvent.changeText(getByPlaceholderText('Tối thiểu 12 ký tự'), 'short');
    fireEvent.changeText(getByPlaceholderText('Nhập lại mật khẩu mới'), 'short');

    fireEvent.press(getByText('Lưu mật khẩu mới'));

    await waitFor(() => {
      expect(getByText('Mật khẩu mới phải từ 12 ký tự trở lên')).toBeTruthy();
    });
    expect(mockFetchJson).not.toHaveBeenCalled();
  });

  it('submits successfully when form is valid', async () => {
    mockFetchJson.mockResolvedValueOnce(undefined);

    const { getByText, getByPlaceholderText } = render(
      <ToastProvider>
        <ChangePasswordScreen />
      </ToastProvider>
    );

    fireEvent.changeText(getByPlaceholderText('Nhập mật khẩu hiện tại'), 'validOldPassword123');
    fireEvent.changeText(getByPlaceholderText('Tối thiểu 12 ký tự'), 'validNewPassword123');
    fireEvent.changeText(getByPlaceholderText('Nhập lại mật khẩu mới'), 'validNewPassword123');

    fireEvent.press(getByText('Lưu mật khẩu mới'));

    await waitFor(() => {
      expect(mockFetchJson).toHaveBeenCalledWith('/users/me/password', {
        method: 'PATCH',
        body: JSON.stringify({
          currentPassword: 'validOldPassword123',
          newPassword: 'validNewPassword123',
        }),
      });
    });
  });
});
