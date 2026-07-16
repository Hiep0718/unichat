import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { App } from './App';

describe('App', () => {
  it('should show the Landing Page when the application renders', async () => {
    // Arrange and Act
    render(<App />);

    // Assert
    // First it shows the suspense fallback
    expect(screen.getByText('Đang tải...')).toBeInTheDocument();

    // Then it should eventually render the landing page hero section
    const heading = await screen.findByRole('heading', { 
      name: /Trợ lý hỏi đáp tài liệu học tập bằng RAG/i 
    });
    expect(heading).toBeInTheDocument();
  });
});