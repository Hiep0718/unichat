/**
 * Lựa chọn sáng/tối của người dùng.
 *
 * Ba trạng thái chứ không phải hai. "Theo hệ thống" là mặc định và là một
 * lựa chọn thật: máy đổi sang tối lúc chiều muộn thì ứng dụng đi theo. Hai
 * trạng thái còn lại là ghi đè, và chúng phải thắng thiết lập hệ điều hành —
 * đó là lý do CSS dùng :root:not([data-theme='light']) trong nhánh
 * prefers-color-scheme.
 */

/** Chế độ hiển thị mà người dùng chọn. */
export type ThemeChoice = 'light' | 'dark' | 'system';

const STORAGE_KEY = 'unichat.theme';
const CHOICES: readonly ThemeChoice[] = ['light', 'dark', 'system'];

/**
 * Kiểm tra một chuỗi bất kỳ có phải lựa chọn hợp lệ không.
 *
 * localStorage là dữ liệu bên ngoài: người dùng sửa được, và một bản cũ của
 * ứng dụng có thể đã ghi vào đó một giá trị mà bản này không còn hiểu.
 */
export function isThemeChoice(value: unknown): value is ThemeChoice {
  return typeof value === 'string' && (CHOICES as readonly string[]).includes(value);
}

/**
 * Đọc lựa chọn đã lưu.
 *
 * @returns Lựa chọn đã lưu, hoặc 'system' khi chưa có hoặc không đọc được.
 */
export function readThemeChoice(): ThemeChoice {
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    return isThemeChoice(stored) ? stored : 'system';
  } catch {
    // Cửa sổ ẩn danh, hoặc trình duyệt chặn lưu trữ của trang. Không đọc
    // được không phải lỗi: ứng dụng chạy theo thiết lập hệ thống.
    return 'system';
  }
}

/**
 * Áp lựa chọn lên tài liệu.
 *
 * 'system' gỡ hẳn thuộc tính đi thay vì đặt nó thành một giá trị, để quy tắc
 * @media trong CSS lại nắm quyền.
 *
 * @param choice Chế độ cần áp.
 * @param root Phần tử gốc, tách ra làm tham số để kiểm thử được.
 */
export function applyTheme(choice: ThemeChoice, root: HTMLElement = document.documentElement): void {
  if (choice === 'system') {
    root.removeAttribute('data-theme');
    return;
  }
  root.setAttribute('data-theme', choice);
}

/**
 * Lưu lựa chọn và áp ngay.
 *
 * @param choice Chế độ người dùng vừa chọn.
 */
export function setThemeChoice(choice: ThemeChoice): void {
  applyTheme(choice);
  try {
    window.localStorage.setItem(STORAGE_KEY, choice);
  } catch {
    // Không lưu được thì lựa chọn chỉ sống trong phiên này. Vẫn tốt hơn là
    // ném lỗi ra giữa một thao tác mà người dùng coi là tức thì.
  }
}

/** Áp lại lựa chọn đã lưu. Gọi một lần khi ứng dụng khởi động. */
export function restoreTheme(): void {
  applyTheme(readThemeChoice());
}

/** Chế độ đang thực sự hiển thị, sau khi đã giải nghĩa "theo hệ thống". */
export type ResolvedTheme = 'light' | 'dark';

/**
 * Cho biết màn hình đang thật sự ở chế độ nào.
 *
 * Khác với {@link readThemeChoice}: hàm kia trả về thứ người dùng đã chọn,
 * có thể là 'system'. Nút bật/tắt nhanh cần biết thứ đang hiển thị để lật
 * đúng chiều — người dùng ở 'system' mà máy đang tối thì bấm một cái phải
 * ra sáng, không phải ra tối.
 *
 * @returns 'light' hoặc 'dark', không bao giờ là 'system'.
 */
export function resolveTheme(): ResolvedTheme {
  const choice = readThemeChoice();
  if (choice !== 'system') {
    return choice;
  }
  try {
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  } catch {
    // Trình duyệt cũ không có matchMedia. Nền sáng là mặc định của CSS.
    return 'light';
  }
}

/**
 * Lật giữa sáng và tối, và lưu lại.
 *
 * Luôn kết thúc ở một lựa chọn tường minh chứ không quay về 'system': người
 * vừa bấm nút là người vừa nói rõ họ muốn gì.
 *
 * @returns Chế độ vừa được áp.
 */
export function toggleTheme(): ResolvedTheme {
  const next: ResolvedTheme = resolveTheme() === 'dark' ? 'light' : 'dark';
  setThemeChoice(next);
  return next;
}
