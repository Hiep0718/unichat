import React from 'react';
import { Text } from 'react-native';
import { render, fireEvent } from '@testing-library/react-native';
import { UCErrorBoundary } from '../../src/components/uc-error-boundary';

function ProblemChild({ shouldThrow }: { shouldThrow: boolean }) {
  if (shouldThrow) {
    throw new Error('Test crash in child component');
  }
  return <Text>Con hoạt động bình thường</Text>;
}

describe('UCErrorBoundary', () => {
  // Suppress expected console.error during error boundary testing
  const originalError = console.error;
  beforeAll(() => {
    console.error = jest.fn();
  });
  afterAll(() => {
    console.error = originalError;
  });

  it('renders children when there is no error', () => {
    const { getByText } = render(
      <UCErrorBoundary>
        <ProblemChild shouldThrow={false} />
      </UCErrorBoundary>
    );

    expect(getByText('Con hoạt động bình thường')).toBeTruthy();
  });

  it('catches render error and shows fallback UI', () => {
    const { getByTestId, getByText } = render(
      <UCErrorBoundary>
        <ProblemChild shouldThrow={true} />
      </UCErrorBoundary>
    );

    expect(getByTestId('uc-error-boundary-fallback')).toBeTruthy();
    expect(getByText('Đã xảy ra lỗi không mong muốn')).toBeTruthy();
    expect(getByText('Thử lại')).toBeTruthy();
  });

  it('resets state when retry button is pressed', () => {
    const onResetMock = jest.fn();
    let shouldThrow = true;

    const { getByTestId, rerender } = render(
      <UCErrorBoundary onReset={onResetMock}>
        <ProblemChild shouldThrow={shouldThrow} />
      </UCErrorBoundary>
    );

    expect(getByTestId('uc-error-boundary-fallback')).toBeTruthy();

    // Fix problem before retry
    shouldThrow = false;
    rerender(
      <UCErrorBoundary onReset={onResetMock}>
        <ProblemChild shouldThrow={shouldThrow} />
      </UCErrorBoundary>
    );

    fireEvent.press(getByTestId('uc-error-boundary-retry-button'));
    expect(onResetMock).toHaveBeenCalledTimes(1);
  });
});
