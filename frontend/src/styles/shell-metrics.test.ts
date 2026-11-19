/// <reference types="node" />
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

/**
 * Giữ cho bề rộng của khung không trôi khỏi thiết kế.
 *
 * `--sidebar-width` từng bị đặt thành 224px trong khi chú thích ở
 * `app-shell.css` vẫn ghi "widens from 68px to 260px on hover". Không có gì
 * đổ: thanh bên chỉ lặng lẽ dành một phần tư bề ngang màn hình để hiển thị
 * biểu tượng 24px, còn nhãn chữ biện minh cho bề rộng đó thì nằm ở
 * opacity 0. Mắt khó bắt được một con số sai; một phép so khớp thì bắt được.
 */
const tokens = readFileSync(join(process.cwd(), 'src/styles/index.css'), 'utf8');

/**
 * Đọc giá trị px của một custom property ở tầng token.
 *
 * Tách dòng chứ không dùng biểu thức chính quy: bản đầu của hàm này dựng mẫu
 * bằng template literal và mất sạch dấu gạch chéo ngược trên đường đi, nên
 * mẫu trở thành `--sidebar-width:s*(d+)px` và không khớp gì cả — trong khi
 * thông báo lỗi lại nói là không tìm thấy token.
 */
function pxToken(name: string): number {
  const line = tokens
    .split('\n')
    .map((row) => row.trim())
    .find((row) => row.startsWith(`${name}:`));

  expect(line, `không tìm thấy ${name}`).toBeDefined();
  return Number.parseInt(line!.slice(name.length + 1).trim(), 10);
}

describe('kích thước của khung', () => {
  it('should make a wide rail earn its width by showing labels', () => {
    // Arrange: cái hỏng thật từng xảy ra là một thanh bên rộng 224px chỉ hiện
    // biểu tượng 24px trong khi nhãn chữ biện minh cho bề rộng đó nằm ở
    // opacity 0. Giờ thanh bên có hai bề rộng: hẹp lúc nghỉ, rộng khi rê
    // chuột. Điều cần giữ là chữ chỉ được ẩn ở bề rộng hẹp.
    const resting = pxToken('--rail-width');
    const expanded = pxToken('--sidebar-width');
    const sidebar = readFileSync(
      join(process.cwd(), 'src/components/side-nav-bar.css'),
      'utf8',
    );

    // Act: mọi quy tắc ẩn nhãn chữ phải nằm sau một bộ chọn "đang nghỉ".
    const hidingRules = [...sidebar.matchAll(/([^{}]*\.side-nav__label[^{}]*)\{([^}]*)\}/g)]
      .filter(([, , body]) => /opacity:\s*0\b|visibility:\s*hidden/.test(body ?? ''))
      .map(([, selector]) => selector ?? '');

    // Assert
    expect(resting).toBeGreaterThanOrEqual(64);
    expect(resting).toBeLessThanOrEqual(96);
    expect(expanded).toBeGreaterThan(96);
    expect(hidingRules.length).toBeGreaterThan(0);
    for (const selector of hidingRules) {
      expect(selector).toContain(':not(:hover');
    }
  });

  it('should leave the content room to grow when the rail gives space back', () => {
    // Arrange, Act: nội dung chỉ chừa bề rộng lúc nghỉ, vì khi nở ra thanh
    // bên đè lên nội dung chứ không đẩy nó.
    const cap = pxToken('--container-max');
    const rail = pxToken('--rail-width');

    // Assert: với trần 1100px, mọi pixel giành lại từ thanh bên rơi vào lề
    // chứ không đến được nội dung. Trần phải đủ lớn để dùng hết chỗ trên
    // màn 1440px.
    expect(cap).toBeGreaterThanOrEqual(1280);
    expect(1440 - rail - cap).toBeLessThan(120);
  });

  it('should keep long text on a readable measure however wide the canvas gets', () => {
    // Assert: nới trần không được phép làm loãng phần đọc; văn bản dài vẫn
    // do --measure giữ lại.
    expect(tokens).toMatch(/--measure:\s*\d+ch/);
  });
});
