import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  applyTheme,
  isThemeChoice,
  readThemeChoice,
  resolveTheme,
  restoreTheme,
  setThemeChoice,
  toggleTheme,
} from './theme';

/**
 * Giả lập thiết lập sáng/tối của hệ điều hành.
 *
 * Gán thẳng chứ không vi.spyOn: jsdom không cài window.matchMedia, nên
 * không có hàm nào để spy lên. Chính khoảng trống đó là lý do resolveTheme
 * bọc lời gọi trong try/catch.
 */
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

describe('theme', () => {
  beforeEach(() => {
    window.localStorage.clear();
    document.documentElement.removeAttribute('data-theme');
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it('should follow the system when nothing has been chosen', () => {
    // Arrange, Act, Assert
    expect(readThemeChoice()).toBe('system');
  });

  it('should remember a choice across reloads', () => {
    // Arrange
    setThemeChoice('dark');

    // Act, Assert: readThemeChoice đọc lại từ lưu trữ, như lần tải sau.
    expect(readThemeChoice()).toBe('dark');
  });

  it('should mark the document so the stylesheet can switch', () => {
    // Arrange, Act
    setThemeChoice('dark');

    // Assert
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
  });

  it('should drop the attribute for system, not set it to a value', () => {
    // Arrange: thuộc tính phải biến mất hẳn, nếu không thì quy tắc @media
    // trong CSS không bao giờ được áp và "theo hệ thống" kẹt ở bản sáng.
    setThemeChoice('dark');

    // Act
    setThemeChoice('system');

    // Assert
    expect(document.documentElement.hasAttribute('data-theme')).toBe(false);
  });

  it('should ignore a stored value this build does not understand', () => {
    // Arrange: một bản cũ của ứng dụng, hoặc người dùng tự sửa lưu trữ.
    window.localStorage.setItem('unichat.theme', 'midnight-neon');

    // Act, Assert
    expect(readThemeChoice()).toBe('system');
  });

  it('should still work when the browser blocks storage', () => {
    // Arrange: cửa sổ ẩn danh hoặc trang bị chặn lưu trữ. Việc đổi giao diện
    // phải thành công, chỉ là không nhớ được sang lần sau.
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('storage disabled');
    });
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('storage disabled');
    });

    // Act, Assert
    expect(() => setThemeChoice('dark')).not.toThrow();
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
    expect(readThemeChoice()).toBe('system');
  });

  it('should re-apply the saved choice on start-up', () => {
    // Arrange
    window.localStorage.setItem('unichat.theme', 'light');

    // Act
    restoreTheme();

    // Assert
    expect(document.documentElement.getAttribute('data-theme')).toBe('light');
  });

  it.each([
    ['light', true],
    ['dark', true],
    ['system', true],
    ['', false],
    ['LIGHT', false],
  ])('should judge %s a valid choice: %s', (value, valid) => {
    expect(isThemeChoice(value)).toBe(valid);
  });

  it('should apply to the element it is given', () => {
    // Arrange: tách phần tử ra làm tham số để test không phụ thuộc <html>.
    const root = document.createElement('div');

    // Act
    applyTheme('dark', root);

    // Assert
    expect(root.getAttribute('data-theme')).toBe('dark');
  });

  it('should report what is on screen, not what was chosen, when following the system', () => {
    // Arrange: người dùng chưa chọn gì, máy đang ở chế độ tối.
    systemPrefersDark(true);

    // Act, Assert
    expect(readThemeChoice()).toBe('system');
    expect(resolveTheme()).toBe('dark');
  });

  it('should let an explicit choice beat the system setting', () => {
    // Arrange
    systemPrefersDark(true);
    setThemeChoice('light');

    // Act, Assert
    expect(resolveTheme()).toBe('light');
  });

  it('should flip away from whatever is currently on screen', () => {
    // Arrange: ở 'system' với máy đang tối, bấm một cái phải ra sáng —
    // không phải ra tối, vốn là thứ xảy ra nếu chỉ đọc lựa chọn đã lưu.
    systemPrefersDark(true);

    // Act
    const next = toggleTheme();

    // Assert
    expect(next).toBe('light');
    expect(document.documentElement.getAttribute('data-theme')).toBe('light');
  });

  it('should flip back on a second press', () => {
    // Arrange
    systemPrefersDark(false);
    toggleTheme();

    // Act
    const next = toggleTheme();

    // Assert
    expect(next).toBe('light');
    expect(readThemeChoice()).toBe('light');
  });

  it('should settle on an explicit choice rather than returning to system', () => {
    // Arrange, Act: người vừa bấm nút là người vừa nói rõ họ muốn gì.
    systemPrefersDark(false);
    toggleTheme();

    // Assert
    expect(readThemeChoice()).toBe('dark');
  });

  it('should fall back to light when the browser has no matchMedia', () => {
    // Arrange: trình duyệt cũ, hoặc jsdom, nơi matchMedia không tồn tại.
    vi.stubGlobal('matchMedia', () => {
      throw new Error('matchMedia unavailable');
    });

    // Act, Assert
    expect(resolveTheme()).toBe('light');
  });
});
