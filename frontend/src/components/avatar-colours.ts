/**
 * Bảng màu avatar: nền và mực cho mỗi màu người dùng chọn được.
 *
 * Để riêng một tệp vì hai nơi cần nó — `entity-avatar.tsx` vẽ avatar, và bộ
 * chọn trong cài đặt tài khoản tô các ô màu. Bộ chọn từng khai màu riêng
 * trong CSS và ba trong sáu ô cùng trỏ vào `var(--muc)`, nên navy, teal và
 * plum ra một ô đen giống hệt nhau và không ô nào mang màu nó sẽ đặt. Một
 * nguồn duy nhất thì hai chỗ không thể lệch nhau nữa.
 */

/** Phải khớp tập màu máy chủ chấp nhận (`AvatarColor`). */
export type AvatarColorKey = 'navy' | 'teal' | 'plum' | 'moss' | 'clay' | 'slate';

/** Nền và mực cho mỗi màu; cặp nào cũng đạt tương phản chữ. */
export const AVATAR_COLOURS: Record<AvatarColorKey, { bg: string; ink: string }> = {
  navy: { bg: '#dbe3f7', ink: '#1e3a8a' },
  teal: { bg: '#cceef2', ink: '#115e64' },
  plum: { bg: '#eedcf0', ink: '#6b2178' },
  moss: { bg: '#dcecd6', ink: '#33612a' },
  clay: { bg: '#f6e0d3', ink: '#8a4118' },
  slate: { bg: '#dfe3e9', ink: '#33415c' },
};
