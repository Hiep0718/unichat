import React from 'react';
import { Text, Pressable } from 'react-native';
import { render, fireEvent } from '@testing-library/react-native';
import { ToastProvider, useToast } from '../../src/lib/toast-context';

function ToastTestConsumer() {
  const { showToast, hideToast } = useToast();

  return (
    <>
      <Pressable
        testID="show-toast-button"
        onPress={() => showToast({ message: 'Thành công rồi!', type: 'success' })}
      >
        <Text>Bật thông báo</Text>
      </Pressable>
      <Pressable testID="hide-toast-button" onPress={hideToast}>
        <Text>Tắt thông báo</Text>
      </Pressable>
    </>
  );
}

describe('ToastContext & ToastProvider', () => {
  it('throws error if useToast is used outside ToastProvider', async () => {
    // Suppress console.error for expected thrown error
    const spy = jest.spyOn(console, 'error').mockImplementation(() => {});

    await expect(render(<ToastTestConsumer />)).rejects.toThrow(
      'useToast must be used within a ToastProvider'
    );

    spy.mockRestore();
  });

  it('shows and hides toast message properly', async () => {
    const { getByTestId, queryByTestId, getByText } = await render(
      <ToastProvider>
        <ToastTestConsumer />
      </ToastProvider>
    );

    expect(queryByTestId('uc-toast-card')).toBeNull();

    await fireEvent.press(getByTestId('show-toast-button'));

    expect(getByTestId('uc-toast-card')).toBeTruthy();
    expect(getByText('Thành công rồi!')).toBeTruthy();

    await fireEvent.press(getByTestId('hide-toast-button'));

    expect(queryByTestId('uc-toast-card')).toBeNull();
  });
});
