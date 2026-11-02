import React from 'react';
import { Alert } from 'react-native';
import { fireEvent, render } from '@testing-library/react-native';
import { router } from 'expo-router';

import { SecuritySection } from '../../../src/features/account/sections/security-section';

describe('SecuritySection', () => {
  beforeEach(() => jest.clearAllMocks());

  it('opens the change-password screen', async () => {
    const { getByLabelText } = await render(<SecuritySection onLogout={jest.fn()} />);

    await fireEvent.press(getByLabelText('Đổi mật khẩu'));

    expect(router.push).toHaveBeenCalledWith('/account/change-password');
  });

  it('asks for confirmation before logging out', async () => {
    const alert = jest.spyOn(Alert, 'alert').mockImplementation(() => undefined);
    const onLogout = jest.fn();
    const { getByLabelText } = await render(<SecuritySection onLogout={onLogout} />);

    await fireEvent.press(getByLabelText('Đăng xuất'));

    expect(onLogout).not.toHaveBeenCalled();
    expect(alert).toHaveBeenCalledTimes(1);
  });

  it('logs out only once the member confirms', async () => {
    const onLogout = jest.fn();
    jest.spyOn(Alert, 'alert').mockImplementation((_title, _message, buttons) => {
      buttons?.find((button) => button.style === 'destructive')?.onPress?.();
    });
    const { getByLabelText } = await render(<SecuritySection onLogout={onLogout} />);

    await fireEvent.press(getByLabelText('Đăng xuất'));

    expect(onLogout).toHaveBeenCalledTimes(1);
  });
});
