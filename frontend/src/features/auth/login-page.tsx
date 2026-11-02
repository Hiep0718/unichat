import { Icon } from '../../components/icon';
import { LoginForm } from './components/login-form';
import heroImage from '../../assets/login-hero.jpg';
import heroPortrait from '../../assets/login-hero-portrait.jpg';

import './login-page.css';

/** Hai nguồn mà câu trả lời mẫu dựa vào, vẽ lại đúng cách sản phẩm làm. */
const DEMO_SOURCES = ['Lập trình hướng đối tượng', 'OOP'];

/**
 * Màn đăng nhập: một nửa kể sản phẩm làm gì, một nửa để đăng nhập.
 *
 * Nửa trái không phải trang trí. Nó diễn lại đúng việc sản phẩm làm — một
 * câu hỏi, một câu trả lời, và các nguồn mà câu trả lời đó dựa vào — nên
 * người chưa có tài khoản nhìn vào là hiểu họ sắp dùng cái gì.
 */
function LoginPage() {
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
            <h1 className="login-story__title">
              Không gian học thuật<br />dành riêng cho bạn.
            </h1>
            <p className="login-story__lede">
              Tập trung tài liệu, trao đổi cùng AI và tiếp tục hành trình học tập
              ngay tại nơi bạn dừng lại.
            </p>

            {/* Một mẫu hội thoại tĩnh, không phải ảnh chụp màn hình giả: chỗ
                quan trọng là hàng nguồn bên dưới câu trả lời, vì đó là thứ phân
                biệt sản phẩm này với một hộp chat bất kỳ. */}
            <div className="login-demo" aria-hidden="true">
              <p className="login-demo__ask">Kế thừa và đa hình khác nhau thế nào?</p>

              <div className="login-demo__answer">
                <span className="login-demo__spark">
                  <Icon name="auto_awesome" size={16} filled />
                </span>
                <div className="login-demo__body">
                  <p className="login-demo__text">
                    Kế thừa cho phép lớp con dùng lại thuộc tính và phương thức của
                    lớp cha; đa hình cho phép cùng một lời gọi phương thức cho kết
                    quả khác nhau tùy đối tượng.
                  </p>
                  <ul className="login-demo__sources">
                    {DEMO_SOURCES.map((source) => (
                      <li key={source} className="login-demo__source">{source}</li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          </div>

          <ul className="login-story__features">
            <li>
              <Icon name="auto_awesome" size={17} filled />
              Hiểu sâu hơn từ chính nguồn tài liệu của bạn
            </li>
            <li>
              <Icon name="forum" size={17} />
              Trao đổi cùng AI
            </li>
          </ul>
        </div>
      </section>

      <main className="login-pane">
        <LoginForm />
        <p className="login-pane__badge">
          <Icon name="shield" size={15} />
          Dữ liệu của bạn được bảo mật
        </p>
      </main>
    </div>
  );
}

export default LoginPage;
