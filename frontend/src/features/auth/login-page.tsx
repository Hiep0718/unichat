/**
 * Login page — centered glassmorphism card with abstract background.
 */

import { Icon } from '../../components/icon';
import { LoginForm } from './components/login-form';
import './login-page.css';

/**
 * Renders the full login page with abstract background and security badge.
 */
function LoginPage() {
  return (
    <div className="login-page">
      <div className="login-page__bg" aria-hidden="true">
        <div className="login-page__blob login-page__blob--1" />
        <div className="login-page__blob login-page__blob--2" />
        <div className="login-page__blob login-page__blob--3" />
      </div>

      <main className="login-page__main">
        <section className="login-page__story" aria-label="Giới thiệu UniChat">
          <div className="login-page__logo">
            <div className="login-page__logo-icon"><Icon name="school" size={25} filled /></div>
            <h1 className="login-page__logo-text">UniChat</h1>
          </div>
          <span className="login-page__eyebrow">TRI THỨC, KẾT NỐI, PHÁT TRIỂN</span>
          <h2>Không gian học thuật<br />dành riêng cho bạn.</h2>
          <p>Tập trung tài liệu, trao đổi cùng AI và tiếp tục hành trình học tập ngay tại nơi bạn dừng lại.</p>
          <div className="login-page__story-note">
            <Icon name="auto_awesome" size={19} filled />
            <span>Hiểu sâu hơn từ chính nguồn tài liệu của bạn</span>
          </div>
        </section>

        <LoginForm />

        <div className="login-page__badge">
          <Icon name="security" size={16} className="login-page__badge-icon" />
          <span>Tài khoản của bạn được bảo vệ bằng xác thực JWT</span>
        </div>
      </main>
    </div>
  );
}

export default LoginPage;
