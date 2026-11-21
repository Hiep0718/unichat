import { readFileSync } from 'fs';
import { join } from 'path';

import { button, dock, messenger, palette, workplace } from '../../src/design/tokens';

/**
 * Mobile không đọc được custom property của web, nên `palette` là bản sao
 * bằng tay của `:root` trong `frontend/src/styles/index.css`. Test này đọc
 * chính file CSS đó, để lần sau web đổi một màu gốc mà mobile quên đổi theo
 * thì test đỏ thay vì hai bản lặng lẽ lệch nhau.
 */
const WEB_CSS = join(__dirname, '..', '..', '..', 'frontend', 'src', 'styles', 'index.css');

/** Khóa có trong `palette` nhưng không phải bản chép của một biến web cùng tên. */
const MOBILE_ONLY = new Set(['nhanDam', 'outline', 'rayCanhBao', 'trenAnhNut', 'trenAnhNutVien']);

const HEX = /^#[0-9a-f]{6}$/i;

function toCssName(key: string): string {
  return '--' + key.replace(/[A-Z]/g, (letter) => '-' + letter.toLowerCase());
}

/** Các biến khai trong khối `:root` đầu tiên (chế độ sáng). */
function readLightRoot(): Map<string, string> {
  const css = readFileSync(WEB_CSS, 'utf8');
  const start = css.indexOf(':root {');
  const end = css.indexOf('\n}', start);
  const block = css.slice(start, end);
  const vars = new Map<string, string>();
  for (const match of block.matchAll(/(--[a-z0-9-]+)\s*:\s*([^;]+);/g)) {
    vars.set(match[1], match[2].trim());
  }
  return vars;
}

describe('palette mirrors the web design tokens', () => {
  const web = readLightRoot();

  it('should copy every base colour from the web root with the same value', () => {
    // Arrange
    const keys = Object.keys(palette).filter((key) => !MOBILE_ONLY.has(key));

    // Act
    const drift = keys.flatMap((key) => {
      const ours = palette[key as keyof typeof palette];
      const theirs = web.get(toCssName(key));
      if (theirs === undefined) return [`${key}: không có ${toCssName(key)} ở web`];
      if (!HEX.test(ours) || !HEX.test(theirs)) return [];
      return ours.toLowerCase() === theirs.toLowerCase() ? [] : [`${key}: mobile ${ours}, web ${theirs}`];
    });

    // Assert
    expect(drift).toEqual([]);
    expect(keys.length).toBeGreaterThanOrEqual(35);
  });

  it('should keep the outline colour equal to the web --color-outline', () => {
    expect(palette.outline.toLowerCase()).toBe(web.get('--color-outline')?.toLowerCase());
  });

  it('should spend one accent on every primary action across the app', () => {
    // Trước đây nút gửi của Trợ lý AI, bình luận và tin nhắn dùng ba màu nhấn khác nhau.
    expect(new Set([button.primaryBg, workplace.accent, dock.accent, messenger.mine])).toEqual(
      new Set([palette.nhan]),
    );
  });

  it('should round every button like the web --btn-radius', () => {
    expect(web.get('--btn-radius')).toBe('var(--radius-full)');
    expect(button.radius).toBeGreaterThanOrEqual(999);
  });
});
