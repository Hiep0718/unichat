import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { App } from './App';

describe('App', () => {
  it('should show the Landing Page when the application renders', async () => {
    // Arrange and Act
    render(<App />);

    // Assert
    // First it shows the suspense fallback
    expect(screen.getByText(/Đang kết nối giao diện/i)).toBeInTheDocument();

    // Then it should eventually render the landing page hero section.
    // The default one second is not enough for a lazily imported route while
    // the rest of the suite runs alongside it: the assertion was failing with
    // the Suspense fallback still on screen, which says the chunk had not
    // resolved rather than that the page is wrong.
    const heading = await screen.findByRole(
      'heading',
      { name: /Trợ lý hỏi đáp tài liệu học tập bằng RAG/i },
      { timeout: 5000 },
    );
    expect(heading).toBeInTheDocument();
  });
});