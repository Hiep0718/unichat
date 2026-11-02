import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';

import { AppearanceSection } from '../../../src/features/account/sections/appearance-section';

describe('AppearanceSection', () => {
  it('shows the light theme as the one in use', async () => {
    const { getByLabelText } = await render(<AppearanceSection />);

    expect(getByLabelText('Sáng').props.accessibilityState.selected).toBe(true);
    expect(getByLabelText('Tối').props.accessibilityState.selected).toBe(false);
  });

  it('says up front that the dark theme is not ready yet', async () => {
    const { getByText } = await render(<AppearanceSection />);

    expect(getByText('Giao diện tối đang được hoàn thiện cho bản di động.')).toBeTruthy();
  });

  it('explains itself rather than silently ignoring a tap on the dark theme', async () => {
    const { getByLabelText, getByText } = await render(<AppearanceSection />);

    await fireEvent.press(getByLabelText('Tối'));

    expect(
      getByText('Chưa chuyển được sang nền tối: bảng màu tối cho di động chưa sẵn sàng.'),
    ).toBeTruthy();
    expect(getByLabelText('Sáng').props.accessibilityState.selected).toBe(true);
  });

  it('clears the explanation when the member taps the theme already in use', async () => {
    const { getByLabelText, getByText } = await render(<AppearanceSection />);

    await fireEvent.press(getByLabelText('Tối'));
    await fireEvent.press(getByLabelText('Sáng'));

    expect(getByText('Giao diện tối đang được hoàn thiện cho bản di động.')).toBeTruthy();
  });
});
