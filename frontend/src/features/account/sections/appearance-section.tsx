import { ThemeChoice } from '../components/theme-choice';

/**
 * Khu vực "Giao diện".
 *
 * Mockup chỉ vẽ hai ô, Sáng và Tối. Lựa chọn thứ ba — theo hệ thống — vẫn
 * giữ: nó đã có trong `lib/theme.ts`, là giá trị mặc định của tài khoản chưa
 * chọn gì, và cũng là thứ mà đoạn script chạy trước khi vẽ trong `index.html`
 * đọc. Bỏ nó đi là mất một chức năng đang chạy chứ không phải đơn giản hoá
 * giao diện. Chữ "Luôn" trong nhãn hai ô kia chỉ có nghĩa khi ô này tồn tại.
 */
export function AppearanceSection() {
  return (
    <section className="settings-card">
      <h2 className="settings-card__title">Giao diện</h2>
      <p className="settings-card__note">
        Lựa chọn này lưu trên thiết bị này và áp dụng ngay.
      </p>
      <ThemeChoice />
    </section>
  );
}
