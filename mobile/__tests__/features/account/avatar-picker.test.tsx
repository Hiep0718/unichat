import React from 'react';
import { fireEvent, render, waitFor } from '@testing-library/react-native';
import * as DocumentPicker from 'expo-document-picker';

import { AvatarPicker } from '../../../src/features/account/components/avatar-picker';
import { accountApi } from '../../../src/features/account/account-api';

jest.mock('expo-document-picker', () => ({ getDocumentAsync: jest.fn() }));

jest.mock('../../../src/features/account/account-api', () => ({
  accountApi: {
    uploadAvatar: jest.fn(),
    removeAvatar: jest.fn(),
    chooseAvatarColor: jest.fn(),
  },
  AVATAR_MAX_BYTES: 2 * 1024 * 1024,
  AVATAR_ACCEPTED_TYPES: ['image/png', 'image/jpeg', 'image/webp'],
}));

const getDocumentAsync = DocumentPicker.getDocumentAsync as jest.MockedFunction<
  typeof DocumentPicker.getDocumentAsync
>;
const uploadAvatar = accountApi.uploadAvatar as jest.MockedFunction<typeof accountApi.uploadAvatar>;
const chooseAvatarColor = accountApi.chooseAvatarColor as jest.MockedFunction<
  typeof accountApi.chooseAvatarColor
>;

const pickedAsset = (overrides: Record<string, unknown> = {}) =>
  ({
    canceled: false,
    assets: [
      {
        uri: 'file:///tmp/me.png',
        name: 'me.png',
        mimeType: 'image/png',
        size: 1024,
        ...overrides,
      },
    ],
  }) as never;

describe('AvatarPicker', () => {
  beforeEach(() => jest.clearAllMocks());

  it('saves the colour the member taps', async () => {
    chooseAvatarColor.mockResolvedValueOnce(undefined);
    const onChanged = jest.fn();
    const { getByLabelText } = await render(
      <AvatarPicker avatarColor="moss" hasAvatar={false} onChanged={onChanged} />,
    );

    await fireEvent.press(getByLabelText('Tím mận'));

    await waitFor(() => expect(chooseAvatarColor).toHaveBeenCalledWith('plum'));
    expect(onChanged).toHaveBeenCalledTimes(1);
  });

  it('returns to the derived colour through the automatic swatch', async () => {
    chooseAvatarColor.mockResolvedValueOnce(undefined);
    const { getByLabelText } = await render(
      <AvatarPicker avatarColor="moss" hasAvatar={false} onChanged={jest.fn()} />,
    );

    await fireEvent.press(getByLabelText('Màu tự động theo tên'));

    await waitFor(() => expect(chooseAvatarColor).toHaveBeenCalledWith(null));
  });

  it('marks the colour currently in use as selected', async () => {
    const { getByLabelText } = await render(
      <AvatarPicker avatarColor="clay" hasAvatar={false} onChanged={jest.fn()} />,
    );

    expect(getByLabelText('Cam đất').props.accessibilityState.selected).toBe(true);
    expect(getByLabelText('Xanh rêu').props.accessibilityState.selected).toBe(false);
  });

  it('uploads the picked image', async () => {
    getDocumentAsync.mockResolvedValueOnce(pickedAsset());
    uploadAvatar.mockResolvedValueOnce(undefined);
    const onChanged = jest.fn();
    const { getByLabelText } = await render(
      <AvatarPicker avatarColor={null} hasAvatar={false} onChanged={onChanged} />,
    );

    await fireEvent.press(getByLabelText('Tải ảnh đại diện lên'));

    await waitFor(() =>
      expect(uploadAvatar).toHaveBeenCalledWith({
        uri: 'file:///tmp/me.png',
        name: 'me.png',
        type: 'image/png',
      }),
    );
    expect(onChanged).toHaveBeenCalledTimes(1);
  });

  it('refuses an image over the 2 MiB the server accepts, without calling it', async () => {
    getDocumentAsync.mockResolvedValueOnce(pickedAsset({ size: 3 * 1024 * 1024 }));
    const { getByLabelText, getByText } = await render(
      <AvatarPicker avatarColor={null} hasAvatar={false} onChanged={jest.fn()} />,
    );

    await fireEvent.press(getByLabelText('Tải ảnh đại diện lên'));

    await waitFor(() => expect(getByText('Ảnh vượt quá 2 MiB. Hãy chọn ảnh nhỏ hơn.')).toBeTruthy());
    expect(uploadAvatar).not.toHaveBeenCalled();
  });

  it('does nothing when the member backs out of the picker', async () => {
    getDocumentAsync.mockResolvedValueOnce({ canceled: true, assets: null } as never);
    const onChanged = jest.fn();
    const { getByLabelText } = await render(
      <AvatarPicker avatarColor={null} hasAvatar={false} onChanged={onChanged} />,
    );

    await fireEvent.press(getByLabelText('Tải ảnh đại diện lên'));

    await waitFor(() => expect(uploadAvatar).not.toHaveBeenCalled());
    expect(onChanged).not.toHaveBeenCalled();
  });

  it('surfaces a failed upload instead of swallowing it', async () => {
    getDocumentAsync.mockResolvedValueOnce(pickedAsset());
    uploadAvatar.mockRejectedValueOnce(new Error('Ảnh đại diện vượt quá 2 MiB'));
    const { getByLabelText, getByText } = await render(
      <AvatarPicker avatarColor={null} hasAvatar={false} onChanged={jest.fn()} />,
    );

    await fireEvent.press(getByLabelText('Tải ảnh đại diện lên'));

    await waitFor(() => expect(getByText('Ảnh đại diện vượt quá 2 MiB')).toBeTruthy());
  });

  it('offers to remove the picture only when there is one', async () => {
    const without = await render(
      <AvatarPicker avatarColor={null} hasAvatar={false} onChanged={jest.fn()} />,
    );
    expect(without.queryByText('Gỡ ảnh, dùng chữ cái')).toBeNull();

    const with_ = await render(
      <AvatarPicker avatarColor={null} hasAvatar onChanged={jest.fn()} />,
    );
    expect(with_.queryByText('Gỡ ảnh, dùng chữ cái')).toBeTruthy();
  });
});
