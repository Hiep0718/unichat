/**
 * Thanh bên đang mở hay đang thu.
 *
 * Tách khỏi component và lưu lại, vì đây là lựa chọn về chỗ làm việc của
 * người dùng: ai đã thu nó lại để lấy chỗ cho nội dung thì không muốn mỗi
 * lần tải trang nó lại bung ra.
 */

const STORAGE_KEY = 'unichat.rail';

/**
 * Đọc trạng thái đã lưu.
 *
 * @returns true khi thanh bên đang thu; mặc định là mở.
 */
export function readRailCollapsed(): boolean {
  try {
    return window.localStorage.getItem(STORAGE_KEY) === 'collapsed';
  } catch {
    // Cửa sổ ẩn danh hoặc trang bị chặn lưu trữ: mở, như mặc định.
    return false;
  }
}

/**
 * Lưu trạng thái.
 *
 * @param collapsed true khi thanh bên đang thu.
 */
export function writeRailCollapsed(collapsed: boolean): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, collapsed ? 'collapsed' : 'open');
  } catch {
    // Không lưu được thì lựa chọn chỉ sống trong phiên này, vẫn hơn là ném
    // lỗi ra giữa một thao tác người dùng coi là tức thì.
  }
}
