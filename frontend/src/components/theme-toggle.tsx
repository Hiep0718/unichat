import { useEffect, useState } from 'react';

import { Icon } from './icon';
import { resolveTheme, toggleTheme } from '../lib/theme';

import type { ResolvedTheme } from '../lib/theme';

/**
 * Lật nhanh giữa nền sáng và nền tối, đặt trong khung nên màn hình nào cũng
 * với tới được.
 *
 * Ba trạng thái đầy đủ — gồm cả "theo hệ thống" — nằm ở trang cài đặt tài
 * khoản. Nút này cố ý chỉ có hai, vì nó là thứ người ta bấm giữa chừng công
 * việc chứ không phải thứ người ta ngồi cân nhắc.
 *
 * Dùng lớp của side-nav để nó nằm thẳng hàng với chuông thông báo và nút
 * đăng xuất ngay cạnh, kể cả khi thanh bên nở ra và nhãn chữ hiện lên.
 */
export function ThemeToggle() {
  const [theme, setTheme] = useState<ResolvedTheme>('light');

  // Đọc sau khi gắn vào DOM, không đọc lúc khởi tạo state: resolveTheme cần
  // window.matchMedia, mà khi render phía máy chủ thì không có.
  useEffect(() => setTheme(resolveTheme()), []);

  const isDark = theme === 'dark';
  const label = isDark ? 'Chuyển sang nền sáng' : 'Chuyển sang nền tối';

  return (
    <button
      type="button"
      className="side-nav__item side-nav__btn"
      onClick={() => setTheme(toggleTheme())}
      title={label}
      aria-label={label}
      aria-pressed={isDark}
    >
      <span className="side-nav__icon-wrap">
        <Icon name={isDark ? 'light_mode' : 'dark_mode'} size={20} rounded />
      </span>
      <span className="side-nav__label">{isDark ? 'Nền sáng' : 'Nền tối'}</span>
    </button>
  );
}
