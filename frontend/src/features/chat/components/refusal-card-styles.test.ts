/// <reference types="node" />
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

/**
 * Giữ cho bề mặt từ chối luôn có style.
 *
 * Những quy tắc này từng sống nhờ trong citation-panel.css và biến mất khi
 * file đó được viết lại cho việc khác. Không test nào đổ, không lỗi biên
 * dịch nào xuất hiện: thẻ chỉ lặng lẽ render thành chữ trần suốt nhiều
 * commit. Test này đọc markup và stylesheet rồi đối chiếu, nên cùng một kiểu
 * hỏng sẽ đổ ở CI chứ không chờ ai đó tình cờ nhìn thấy.
 */
// Vitest bỏ qua mọi import .css, nên `?raw` trả về chuỗi rỗng; stylesheet
// phải được đọc từ đĩa. Chỉ định type Node ngay tại đây thay vì thêm vào
// trường "types" của tsconfig, để global của Node không lọt vào mã app.
const here = join(process.cwd(), 'src/features/chat/components');
const read = (name: string) => readFileSync(join(here, name), 'utf8');

const stylesheet = read('refusal-card.css');

/** Stylesheet đã bỏ chú thích, để phép so khớp đọc quy tắc chứ không đọc văn xuôi. */
const rules = stylesheet.replace(/\/\*[\s\S]*?\*\//g, '');

/** Rút mọi class `refusal-card*` mà một file .tsx thật sự gắn lên DOM. */
function classesUsedIn(file: string): readonly string[] {
  const markup = read(file);
  const found = new Set<string>();
  for (const match of markup.matchAll(/refusal-card(?:__|--)?[a-z-]*/g)) {
    // `refusal-card--${isClarify ? ...}` để lại mảnh "refusal-card--" trước
    // chỗ nội suy. Mảnh đó không phải tên lớp nào cả; hai tên thật mà nó
    // dựng ra được kiểm riêng ở test dưới.
    if (/[-_]$/.test(match[0])) continue;
    found.add(match[0]);
  }
  return [...found];
}

describe('refusal-card stylesheet', () => {
  it.each(['refusal-card.tsx', 'chat-policy-notice.tsx'])(
    'should declare every class %s renders',
    (file) => {
      // Arrange
      const used = classesUsedIn(file);

      // Act
      const undeclared = used.filter((name) => !stylesheet.includes(`.${name}`));

      // Assert
      expect(used.length).toBeGreaterThan(0);
      expect(undeclared).toEqual([]);
    },
  );

  it('should give the card a ground of its own, not leave it transparent', () => {
    // Arrange, Act, Assert: thẻ chạy không nền chính là triệu chứng của lần
    // hỏng trước, nên nền là thứ được kiểm riêng.
    expect(stylesheet).toMatch(/\.refusal-card\s*\{[^}]*background:\s*var\(--be-mat\)/);
  });

  it('should tell the two kinds apart without using colour to do it', () => {
    // Arrange, Act, Assert: hai lớp biến thể được gắn động nên phép rút tên
    // ở trên không thấy chúng; kiểm thẳng ở đây để chúng không thành lớp chết.
    expect(rules).toMatch(/\.refusal-card--refuse\s*\{[^}]*border-inline-start/);
    expect(rules).toMatch(/\.refusal-card--clarify\s*\{[^}]*border-inline-start/);
  });

  it('should mark the policy link as a link rather than as body text', () => {
    // Arrange, Act, Assert: cùng màu mực với chữ quanh nó thì gạch chân là
    // thứ duy nhất nói cho người đọc biết chỗ này bấm được.
    expect(stylesheet).toMatch(/\.refusal-card a\s*\{[^}]*text-decoration:\s*underline/);
  });

  it('should not paint a grounded refusal as an error', () => {
    // Arrange, Act, Assert: từ chối khi thiếu bằng chứng là kết quả đúng của
    // sản phẩm. Bản cũ tô nó bằng màu lỗi và viền đỏ.
    expect(rules).not.toMatch(/--color-error|rgba\(186,\s*26,\s*26/);
  });
});
