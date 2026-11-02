import { Link } from 'react-router-dom';

import { Icon } from '../../components/icon';
import { RegisterForm } from './components/register-form';
import heroImage from '../../assets/login-hero.jpg';
import heroPortrait from '../../assets/login-hero-portrait.jpg';

import './login-page.css';
import './register-page.css';

/** Ba việc sản phẩm làm, viết theo thứ tự người mới gặp chúng. */
const FEATURES = [
  {
    icon: 'auto_awesome',
    title: 'Trả lời dựa trên tài liệu của bạn',
    body: 'AI tìm đúng đoạn trong giáo trình, bài giảng bạn tải lên để trả lời chính xác, kèm nguồn trích dẫn.',
  },
  {
    icon: 'menu_book',
    title: 'Quản lý tài liệu thông minh',
    body: 'Sắp xếp tài liệu theo từng môn học, tóm tắt và trích ý chính khi bạn cần ôn tập.',
  },
  {
    icon: 'group',
    title: 'Học nhóm dễ dàng',
    body: 'Chia sẻ không gian học tập và cùng nghiên cứu với các thành viên trong nhóm.',
  },
] as const;

/**
 * Màn đăng ký: một nửa nói sản phẩm làm gì, một nửa để tạo tài khoản.
 *
 * Dùng chung vỏ với màn đăng nhập. Nửa trái khác nội dung — ở đây là ba việc
 * cụ thể, vì người chưa có tài khoản cần biết họ đổi email lấy cái gì.
 */
function RegisterPage() {
  return (
    <div className="login-page">
      <section className="login-story" aria-label="Giới thiệu UniChat">
        <picture className="login-story__art">
          {/* Ảnh dọc cho khổ điện thoại: ảnh ngang bị cắt ở đó thì điểm
              sáng trung tâm rơi ra ngoài khung. 50 KB so với 118 KB của bản
              ngang, nên máy nhỏ cũng không tải thứ nó không dùng. */}
          <source media="(max-width: 1023px)" srcSet={heroPortrait} />
          <img src={heroImage} alt="" aria-hidden="true" />
        </picture>

        {/* Nút quay lại chỉ hiện ở khổ điện thoại. Ở khổ rộng, liên kết
            "Đăng nhập ngay" trong thẻ đã làm việc đó, nên thêm một lối nữa
            chỉ là hai cách đi cùng một chỗ. */}
        <Link to="/login" className="register-story__back" aria-label="Quay lại đăng nhập">
          <Icon name="chevron_left" size={20} rounded />
        </Link>

        <div className="login-story__inner">
          <div className="login-story__brand">
            <span className="login-story__brand-mark">
              <Icon name="school" size={22} filled />
            </span>
            <span className="login-story__brand-text">
              <strong>UniChat</strong>
              <small>AI Platform</small>
            </span>
          </div>

          <div className="login-story__pitch">
            <p className="register-story__tag">Miễn phí cho sinh viên</p>

            <h1 className="login-story__title">
              Học sâu hơn từ chính<br />tài liệu của bạn.
            </h1>

            <ul className="register-story__features">
              {FEATURES.map((feature) => (
                <li key={feature.icon} className="register-story__feature">
                  <span className="register-story__feature-mark">
                    <Icon name={feature.icon} size={19} filled />
                  </span>
                  <div>
                    <p className="register-story__feature-title">{feature.title}</p>
                    <p className="register-story__feature-body">{feature.body}</p>
                  </div>
                </li>
              ))}
            </ul>
          </div>

          <p className="register-story__badge">
            <Icon name="shield" size={15} />
            Dữ liệu của bạn được bảo mật
          </p>
        </div>
      </section>

      <main className="login-pane">
        <div className="register-card">
          {/* Không bọc thêm một thẻ nào quanh hai dòng này: tiêu đề và phụ đề
              đã có margin của riêng chúng, nên thẻ bọc chỉ là một lớp không
              quy tắc nào đi kèm. */}
          <h2 className="register-card__title">Tham gia UniChat ngay hôm nay</h2>
          <p className="register-card__subtitle">
            Tạo tài khoản để bắt đầu học cùng AI trên chính tài liệu của bạn.
          </p>
          <RegisterForm />
        </div>
      </main>
    </div>
  );
}

export default RegisterPage;
