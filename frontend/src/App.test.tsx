import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { App } from './App';

describe('App', () => {
  it('should show the UniChat scaffold when the application renders', () => {
    // Arrange and Act
    render(<App />);

    // Assert
    expect(
      screen.getByRole('heading', { level: 1, name: 'UniChat' }),
    ).toBeInTheDocument();
    expect(screen.getByText('Truy hồi tri thức thích ứng', { exact: false })).toBeInTheDocument();
  });
});