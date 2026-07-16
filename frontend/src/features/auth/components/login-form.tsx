/**
 * Login form component with email/password fields.
 */

import { useState } from 'react';
import { Link } from 'react-router-dom';

import { Icon } from '../../../components/icon';
import './login-form.css';

/**
 * Renders the login form card with email, password, remember-me, and submit.
 */
export function LoginForm() {
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    // TODO: wire to auth API
  };

  return (
    <div className="login-card">
      <div className="login-card__header">
        <h2 className="login-card__title">Đăng nhập vào UniChat</h2>
        <p className="login-card__subtitle">
          Truy cập không gian làm việc RAG của bạn
        </p>
      </div>

      <form className="login-form" onSubmit={handleSubmit}>
        <div className="login-form__field">
          <label className="login-form__label" htmlFor="login-email">Email</label>
          <div className="login-form__input-wrap">
            <Icon name="mail" size={20} className="login-form__icon" />
            <input
              className="login-form__input login-form__input--icon"
              id="login-email"
              name="email"
              type="email"
              placeholder="Nhập địa chỉ email"
              required
              autoComplete="email"
            />
          </div>
        </div>

        <div className="login-form__field">
          <div className="login-form__label-row">
            <label className="login-form__label" htmlFor="login-password">Mật khẩu</label>
            <a href="#" className="login-form__forgot">Quên mật khẩu?</a>
          </div>
          <div className="login-form__input-wrap">
            <Icon name="lock" size={20} className="login-form__icon" />
            <input
              className="login-form__input login-form__input--icon login-form__input--password"
              id="login-password"
              name="password"
              type={showPassword ? 'text' : 'password'}
              placeholder="••••••••"
              required
              autoComplete="current-password"
            />
            <button
              className="login-form__toggle-pw"
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              aria-label={showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
            >
              <Icon name={showPassword ? 'visibility' : 'visibility_off'} size={20} />
            </button>
          </div>
        </div>

        <div className="login-form__remember">
          <input type="checkbox" id="remember-me" name="remember-me" className="login-form__checkbox" />
          <label htmlFor="remember-me" className="login-form__remember-label">
            Ghi nhớ đăng nhập
          </label>
        </div>

        <button className="login-form__submit" type="submit">
          Đăng nhập
          <Icon name="arrow_forward" size={18} />
        </button>
      </form>

      <div className="login-card__footer">
        <p>
          Chưa có tài khoản?{' '}
          <Link to="/register" className="login-card__link">Đăng ký</Link>
        </p>
      </div>
    </div>
  );
}
