/// <reference types="node" />
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

/**
 * Giữ cho các màn xác thực luôn có style.
 *
 * Đây là lần thứ hai cùng một kiểu hỏng xảy ra trong dự án: một stylesheet
 * được viết lại cho màn này, và một màn khác đang mượn các lớp trong đó thì
 * lặng lẽ chạy không style. Không test nào đổ, không lỗi biên dịch nào xuất
 * hiện — trang chỉ trông như chưa tải xong CSS. Lần đầu là thẻ từ chối ở màn
 * chat; lần này là trang khôi phục mật khẩu, vốn mượn tám lớp của màn đăng
 * nhập.
 */
const authDir = join(process.cwd(), 'src/features/auth');
const read = (name: string) => readFileSync(join(authDir, name), 'utf8');

/** Gộp mọi stylesheet mà một trang import, để đối chiếu với markup của nó. */
function stylesFor(page: string): string {
  const markup = read(page);
  const sheets = [...markup.matchAll(/import '\.(\/[^']+\.css)'/g)].map((m) => m[1]!);
  return sheets.map((sheet) => read(sheet.replace(/^\//, ''))).join('\n');
}

/** Rút các lớp của màn xác thực mà một trang thực sự gắn lên DOM. */
function classesIn(page: string): readonly string[] {
  const markup = read(page)
    // Chú thích nhắc tên lớp cũ để giải thích lịch sử; chúng không phải
    // lớp đang dùng, nên bỏ ra trước khi rút.
    .replace(/\{\/\*[\s\S]*?\*\/\}/g, '')
    .replace(/\/\*[\s\S]*?\*\//g, '');

  const found = new Set<string>();
  for (const match of markup.matchAll(/className="([^"]+)"/g)) {
    for (const name of match[1]!.split(/\s+/)) {
      if (/^(login|register)-/.test(name)) found.add(name);
    }
  }
  return [...found];
}

describe.each(['login-page.tsx', 'forgot-password-page.tsx', 'register-page.tsx'])(
  'kiểu của %s',
  (page) => {
    it('should have a rule for every class it renders', () => {
      // Arrange
      const used = classesIn(page);
      const styles = stylesFor(page);

      // Act
      const undeclared = used.filter((name) => !styles.includes(`.${name}`));

      // Assert
      expect(used.length).toBeGreaterThan(0);
      expect(undeclared).toEqual([]);
    });
  },
);
