import React from 'react';
import { fireEvent, render, waitFor } from '@testing-library/react-native';

import { ProfileSection } from '../../../src/features/account/sections/profile-section';
import { accountApi } from '../../../src/features/account/account-api';

import type { UserResponse } from '../../../src/types/api';

jest.mock('../../../src/features/account/account-api', () => ({
  accountApi: {
    updateDisplayName: jest.fn(),
    chooseAvatarColor: jest.fn(),
    uploadAvatar: jest.fn(),
    removeAvatar: jest.fn(),
  },
  avatarSource: jest.fn(() => ({ uri: 'http://x/avatar', headers: undefined })),
  AVATAR_MAX_BYTES: 2 * 1024 * 1024,
  AVATAR_ACCEPTED_TYPES: ['image/png'],
}));

jest.mock('expo-document-picker', () => ({ getDocumentAsync: jest.fn() }));

const updateDisplayName = accountApi.updateDisplayName as jest.MockedFunction<
  typeof accountApi.updateDisplayName
>;

const profile: UserResponse = {
  id: 'u1',
  email: 'hungdz1372004@gmail.com',
  displayName: 'hungdz1372004',
  hasAvatar: false,
  avatarColor: 'moss',
};

describe('ProfileSection', () => {
  beforeEach(() => jest.clearAllMocks());

  it('tells the member their mention handle stays the same', async () => {
    const { getByText } = await render(<ProfileSection profile={profile} onChanged={jest.fn()} />);

    expect(getByText('Người khác vẫn nhắc bạn bằng @hungdz1372004.')).toBeTruthy();
  });

  it('shows the email as read-only text with no way to edit it', async () => {
    const { getByText, queryByDisplayValue } = await render(
      <ProfileSection profile={profile} onChanged={jest.fn()} />,
    );

    expect(getByText('hungdz1372004@gmail.com')).toBeTruthy();
    expect(queryByDisplayValue('hungdz1372004@gmail.com')).toBeNull();
  });

  it('offers no save button until the name actually changes', async () => {
    const { queryByText, getByLabelText } = await render(
      <ProfileSection profile={profile} onChanged={jest.fn()} />,
    );

    expect(queryByText('Lưu')).toBeNull();

    await fireEvent.changeText(getByLabelText('Tên hiển thị'), 'Phi Hùng');

    expect(queryByText('Lưu')).toBeTruthy();
  });

  it('keeps the save button hidden when the edit only adds whitespace', async () => {
    const { queryByText, getByLabelText } = await render(
      <ProfileSection profile={profile} onChanged={jest.fn()} />,
    );

    await fireEvent.changeText(getByLabelText('Tên hiển thị'), '  hungdz1372004  ');

    expect(queryByText('Lưu')).toBeNull();
  });

  it('saves the trimmed name and tells the caller to refresh', async () => {
    updateDisplayName.mockResolvedValueOnce({ ...profile, displayName: 'Phi Hùng' });
    const onChanged = jest.fn();
    const { getByText, getByLabelText } = await render(
      <ProfileSection profile={profile} onChanged={onChanged} />,
    );

    await fireEvent.changeText(getByLabelText('Tên hiển thị'), '  Phi Hùng  ');
    await fireEvent.press(getByText('Lưu'));

    await waitFor(() => expect(getByText('Đã lưu tên hiển thị.')).toBeTruthy());
    expect(updateDisplayName).toHaveBeenCalledWith('Phi Hùng');
    expect(onChanged).toHaveBeenCalledTimes(1);
  });

  it('reports a failed rename and leaves the edit in the field', async () => {
    updateDisplayName.mockRejectedValueOnce(new Error('Tên hiển thị tối đa 50 ký tự'));
    const onChanged = jest.fn();
    const { getByText, getByLabelText } = await render(
      <ProfileSection profile={profile} onChanged={onChanged} />,
    );

    await fireEvent.changeText(getByLabelText('Tên hiển thị'), 'Phi Hùng');
    await fireEvent.press(getByText('Lưu'));

    await waitFor(() => expect(getByText('Tên hiển thị tối đa 50 ký tự')).toBeTruthy());
    expect(getByLabelText('Tên hiển thị').props.value).toBe('Phi Hùng');
    expect(onChanged).not.toHaveBeenCalled();
  });
});
