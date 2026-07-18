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
        <div className="login-page__logo">
          <div className="login-page__logo-icon">
            <Icon name="chat_bubble" size={24} />
          </div>
          <h1 className="login-page__logo-text">UniChat</h1>
        </div>

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
