import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { ThemeToggle } from './theme-toggle';

// Vitest `globals` tắt toàn dự án nên RTL không tự gắn auto-cleanup.
afterEach(cleanup);

/** jsdom không cài window.matchMedia, nên nó được gán vào chứ không spy. */
function systemPrefersDark(dark: boolean) {
  vi.stubGlobal('matchMedia', (query: string) => ({
    matches: dark && query.includes('dark'),
    media: query,
    addEventListener: () => {},
    removeEventListener: () => {},
    addListener: () => {},
    removeListener: () => {},
    onchange: null,
    dispatchEvent: () => false,
  }));
}

describe('ThemeToggle', () => {
  beforeEach(() => {
    window.localStorage.clear();
    document.documentElement.removeAttribute('data-theme');
    systemPrefersDark(false);
  });

  afterEach(() => vi.unstubAllGlobals());

  it('should offer to switch to dark while the screen is light', () => {
    // Arrange, Act
    render(<ThemeToggle />);

    // Assert
    expect(screen.getByRole('button', { name: 'Chuyển sang nền tối' })).toBeInTheDocument();
  });

  it('should switch the document over when pressed', () => {
    // Arrange
    render(<ThemeToggle />);

    // Act
    fireEvent.click(screen.getByRole('button'));

    // Assert
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
  });

  it('should offer the way back after it has switched', () => {
    // Arrange
    render(<ThemeToggle />);

    // Act
    fireEvent.click(screen.getByRole('button'));

    // Assert
    expect(screen.getByRole('button', { name: 'Chuyển sang nền sáng' })).toBeInTheDocument();
  });

  it('should return to light on a second press', () => {
    // Arrange
    render(<ThemeToggle />);
    const button = screen.getByRole('button');

    // Act
    fireEvent.click(button);
    fireEvent.click(button);

    // Assert
    expect(document.documentElement.getAttribute('data-theme')).toBe('light');
  });

  it('should start from what is on screen, not from what was stored', () => {
    // Arrange: chưa ai chọn gì, nhưng máy đang ở chế độ tối. Nút phải mời
    // chuyển sang SÁNG — mời sang tối là lật nhầm chiều.
    systemPrefersDark(true);

    // Act
    render(<ThemeToggle />);

    // Assert
    expect(screen.getByRole('button', { name: 'Chuyển sang nền sáng' })).toBeInTheDocument();
  });

  it('should tell assistive tech which state it is in', () => {
    // Arrange, Act
    render(<ThemeToggle />);
    fireEvent.click(screen.getByRole('button'));

    // Assert
    expect(screen.getByRole('button')).toHaveAttribute('aria-pressed', 'true');
  });

  it('should remember the choice for the next visit', () => {
    // Arrange, Act
    render(<ThemeToggle />);
    fireEvent.click(screen.getByRole('button'));

    // Assert
    expect(window.localStorage.getItem('unichat.theme')).toBe('dark');
  });
});
