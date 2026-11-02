/**
 * Bảng màu avatar cho bản di động.
 *
 * Sao chép từ `frontend/src/components/avatar-colours.ts`. React Native không
 * có custom property nên không tham chiếu được sang web; khoá phải khớp đúng
 * enum `AvatarColor` của Core API, nếu lệch thì máy chủ từ chối lựa chọn.
 */

/** Phải khớp tập màu máy chủ chấp nhận (`AvatarColor`). */
export type AvatarColorKey = 'navy' | 'teal' | 'plum' | 'moss' | 'clay' | 'slate';

/** Thứ tự hiển thị trong bộ chọn, khớp bộ chọn trên web. */
export const AVATAR_COLOR_KEYS: readonly AvatarColorKey[] = [
  'moss',
  'clay',
  'navy',
  'plum',
  'teal',
  'slate',
];

/** Nền và mực cho mỗi màu; cặp nào cũng đạt tương phản chữ. */
export const AVATAR_COLOURS: Record<AvatarColorKey, { bg: string; ink: string }> = {
  navy: { bg: '#dbe3f7', ink: '#1e3a8a' },
  teal: { bg: '#cceef2', ink: '#115e64' },
  plum: { bg: '#eedcf0', ink: '#6b2178' },
  moss: { bg: '#dcecd6', ink: '#33612a' },
  clay: { bg: '#f6e0d3', ink: '#8a4118' },
  slate: { bg: '#dfe3e9', ink: '#33415c' },
};

/** Nhãn đọc được cho trình đọc màn hình. */
export const AVATAR_COLOR_LABELS: Record<AvatarColorKey, string> = {
  navy: 'Xanh navy',
  teal: 'Xanh ngọc',
  plum: 'Tím mận',
  moss: 'Xanh rêu',
  clay: 'Cam đất',
  slate: 'Xám đá',
};

/** Băm ổn định để một tên luôn ra cùng một tông màu. */
function hueFromName(name: string): number {
  let hash = 0;
  for (let index = 0; index < name.length; index += 1) {
    hash = (hash * 31 + name.charCodeAt(index)) % 360;
  }
  return hash;
}

/** Ép một chuỗi tuỳ ý về khoá màu hợp lệ, hoặc null nếu không nhận ra. */
export function toAvatarColorKey(value: string | null | undefined): AvatarColorKey | null {
  if (!value) return null;
  const wanted = value.trim().toLowerCase() as AvatarColorKey;
  return wanted in AVATAR_COLOURS ? wanted : null;
}

/**
 * Nền và mực cho avatar chữ cái.
 *
 * Màu người dùng chọn được ưu tiên; không có thì suy ra từ tên, cùng công
 * thức với `EntityAvatar` trên web để hai nền tảng vẽ ra một màu giống nhau.
 */
export function avatarPaint(
  name: string,
  chosen: AvatarColorKey | null,
): { bg: string; ink: string } {
  if (chosen) return AVATAR_COLOURS[chosen];
  const hue = hueFromName(name.trim() || '?');
  return { bg: `hsl(${hue}, 62%, 92%)`, ink: `hsl(${hue}, 68%, 28%)` };
}
