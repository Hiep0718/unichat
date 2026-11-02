import React from 'react';
import { render, waitFor } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

import AccountTabScreen from '../../../app/(tabs)/account';
import { accountApi } from '../../../src/features/account/account-api';
import { useAuth } from '../../../src/features/auth/auth-context';

import type { UserResponse } from '../../../src/types/api';

jest.mock('../../../src/features/account/account-api', () => ({
  accountApi: {
    getMe: jest.fn(),
    updateDisplayName: jest.fn(),
    uploadAvatar: jest.fn(),
    removeAvatar: jest.fn(),
    chooseAvatarColor: jest.fn(),
  },
  avatarSource: jest.fn(() => ({ uri: 'http://x/avatar', headers: undefined })),
  AVATAR_MAX_BYTES: 2 * 1024 * 1024,
  AVATAR_ACCEPTED_TYPES: ['image/png'],
}));

jest.mock('expo-document-picker', () => ({ getDocumentAsync: jest.fn() }));

jest.mock('../../../src/features/auth/auth-context', () => ({ useAuth: jest.fn() }));

const getMe = accountApi.getMe as jest.MockedFunction<typeof accountApi.getMe>;
const mockedUseAuth = useAuth as jest.MockedFunction<typeof useAuth>;

const profile: UserResponse = {
  id: 'u1',
  email: 'hungdz1372004@gmail.com',
  displayName: 'hungdz1372004',
  hasAvatar: false,
  avatarColor: 'moss',
};

let client: QueryClient | null = null;

/** A fresh client per test so one test's cache cannot answer the next one. */
const renderScreen = () => {
  client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <AccountTabScreen />
    </QueryClientProvider>,
  );
};

describe('AccountTabScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedUseAuth.mockReturnValue({
      token: 't',
      user: profile,
      isAuthenticated: true,
      isLoading: false,
      sessionError: null,
      login: jest.fn(),
      logout: jest.fn(),
      refreshProfile: jest.fn(),
    });
  });

  afterEach(() => {
    // Bộ đệm còn sống sẽ giữ bộ đếm thu gom, và Jest báo rò rỉ tiến trình con.
    client?.clear();
    client = null;
  });

  it('carries its own title, since the navigator header is off for this tab', async () => {
    getMe.mockResolvedValueOnce(profile);

    const { getByText } = await renderScreen();

    await waitFor(() => expect(getByText('Tài khoản')).toBeTruthy());
  });

  it('shows every section of the account screen', async () => {
    getMe.mockResolvedValueOnce(profile);

    const { getByText } = await renderScreen();

    await waitFor(() => expect(getByText('HỒ SƠ')).toBeTruthy());
    expect(getByText('GIAO DIỆN')).toBeTruthy();
    expect(getByText('BẢO MẬT')).toBeTruthy();
  });

  it('prefers the freshly fetched profile over the stale session copy', async () => {
    getMe.mockResolvedValueOnce({ ...profile, displayName: 'Phi Hùng' });

    const { getByText } = await renderScreen();

    await waitFor(() => expect(getByText('Phi Hùng')).toBeTruthy());
  });

  it('still names the member from the session while the profile is loading', async () => {
    // Giữ được lời hứa để kết thúc trước khi bài kiểm tra xong: một lời hứa
    // không bao giờ xong sẽ để Jest treo lại sau khi mọi bài đã chạy hết.
    let settle: (value: UserResponse) => void = () => undefined;
    getMe.mockReturnValueOnce(new Promise<UserResponse>((resolve) => { settle = resolve; }));

    const { getAllByText } = await renderScreen();
    expect(getAllByText('hungdz1372004').length).toBeGreaterThan(0);

    settle(profile);
    await waitFor(() => expect(getMe).toHaveBeenCalled());
  });

  it('falls back to the email handle when the profile has no display name', async () => {
    getMe.mockResolvedValueOnce({ ...profile, displayName: undefined });

    const { getAllByText } = await renderScreen();

    await waitFor(() => expect(getAllByText('hungdz1372004').length).toBeGreaterThan(0));
  });
});
