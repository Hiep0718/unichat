import { Icon } from './icon';

import './footer.css';

/**
 * Các mục ở chân trang.
 *
 * Cả bốn hiện trỏ vào neo không tồn tại — `#about`, `#terms`, `#privacy`,
 * `#contact` không có đích nào trên site. Chúng được giữ nguyên vì mockup
 * yêu cầu, nhưng mỗi mục cần một trang thật trước khi phát hành; cùng với
 * hai liên kết điều khoản ở màn đăng ký, đang có sáu liên kết như vậy.
 */
const LINKS = [
  { href: '#docs', label: 'Tài liệu hướng dẫn' },
  { href: '#terms', label: 'Điều khoản sử dụng' },
  { href: '#privacy', label: 'Chính sách bảo mật' },
  { href: '#contact', label: 'Liên hệ' },
] as const;

/** Chân trang của các trang công khai. */
export function Footer() {
  return (
    <footer className="site-footer">
      <div className="site-footer__inner">
        <p className="site-footer__logo">
          <Icon name="school" filled size={16} />
          UniChat
        </p>

        <nav className="site-footer__links" aria-label="Liên kết chân trang">
          {LINKS.map((link) => (
            <a key={link.href} href={link.href} className="site-footer__link">
              {link.label}
            </a>
          ))}
        </nav>

        {/* Năm lấy từ đồng hồ, không viết cứng: dòng này đang ghi 2024 trong
            khi đã sang 2026, và một bản quyền lạc hai năm thì tự nó nói trang
            này lâu rồi không ai ngó tới. */}
        <p className="site-footer__copyright">
          © {new Date().getFullYear()} UniChat
        </p>
      </div>
    </footer>
  );
}
