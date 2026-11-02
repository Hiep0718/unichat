import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { ThemeChoice } from './theme-choice';

// Vitest `globals` tắt toàn dự án nên RTL không tự gắn auto-cleanup.
afterEach(cleanup);

describe('ThemeChoice', () => {
  beforeEach(() => {
    window.localStorage.clear();
    document.documentElement.removeAttribute('data-theme');
  });

  it('should offer the three modes as a radio group', () => {
    // Arrange, Act
    render(<ThemeChoice />);

    // Assert
    expect(screen.getByRole('radiogroup', { name: 'Chế độ hiển thị' })).toBeInTheDocument();
    expect(screen.getAllByRole('radio')).toHaveLength(3);
  });

  it('should start on "theo hệ thống" for an account that never chose', () => {
    // Arrange, Act
    render(<ThemeChoice />);

    // Assert
    expect(screen.getByRole('radio', { name: /Theo hệ thống/ })).toBeChecked();
  });

  it('should switch the document over when a mode is picked', () => {
    // Arrange
    render(<ThemeChoice />);

    // Act
    fireEvent.click(screen.getByRole('radio', { name: /Tối/ }));

    // Assert
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
    expect(screen.getByRole('radio', { name: /Tối/ })).toBeChecked();
  });

  it('should show the mode already in force rather than a default', () => {
    // Arrange: mở trang cài đặt sau khi đã chọn tối ở lần trước. Nút đang
    // chọn phải khớp với thứ đang hiển thị ngay từ lần vẽ đầu.
    window.localStorage.setItem('unichat.theme', 'dark');

    // Act
    render(<ThemeChoice />);

    // Assert
    expect(screen.getByRole('radio', { name: /Tối/ })).toBeChecked();
  });

  it('should hand control back to the system when that is chosen', () => {
    // Arrange
    window.localStorage.setItem('unichat.theme', 'dark');
    render(<ThemeChoice />);

    // Act
    fireEvent.click(screen.getByRole('radio', { name: /Theo hệ thống/ }));

    // Assert: thuộc tính phải biến mất, nếu không quy tắc @media không được áp.
    expect(document.documentElement.hasAttribute('data-theme')).toBe(false);
  });

  it('should remember the pick for the next visit', () => {
    // Arrange
    render(<ThemeChoice />);

    // Act
    fireEvent.click(screen.getByRole('radio', { name: /Sáng/ }));

    // Assert
    expect(window.localStorage.getItem('unichat.theme')).toBe('light');
  });
});
