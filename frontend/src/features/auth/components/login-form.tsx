import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';

import { Icon } from '../../../components/icon';
import { authApi } from '../api/auth-api';
import { useAuth } from '../auth-context';
import type { ApiError } from '../../../lib/api-client';
import './login-form.css';

/**
 * Renders the login form card with email, password, remember-me, and submit.
 */
export function LoginForm() {
  const [showPassword, setShowPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const navigate = useNavigate();
  const { setToken } = useAuth();

  const loginMutation = useMutation({
    mutationFn: authApi.login,
    onSuccess: (data) => {
      setToken(data.accessToken);
      navigate('/workspaces');
    },
    onError: (error: ApiError) => {
      setErrorMsg(error.message || 'Đăng nhập thất bại. Vui lòng kiểm tra lại thông tin.');
    },
  });

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setErrorMsg(null);
    const formData = new FormData(e.currentTarget);
    const email = formData.get('email') as string;
    const password = formData.get('password') as string;
    
    loginMutation.mutate({ email, password });
  };

  return (
    <div className="login-card">
      <div className="login-card__header">
        <h2 className="login-card__title">Đăng nhập vào UniChat</h2>
        <p className="login-card__subtitle">
          Truy cập không gian làm việc RAG của bạn
        </p>
      </div>

      {errorMsg && (
        <div className="login-form__error">
          <Icon name="error" size={18} />
          {errorMsg}
        </div>
      )}

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
            <Link to="/forgot-password" className="login-form__forgot">Quên mật khẩu?</Link>
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

        <button 
          className="login-form__submit" 
          type="submit"
          disabled={loginMutation.isPending}
        >
          {loginMutation.isPending ? 'Đang xử lý...' : 'Đăng nhập'}
          {!loginMutation.isPending && <Icon name="arrow_forward" size={18} />}
        </button>

        <button
          className="login-form__submit"
          type="button"
          onClick={() => {
            const mockJwt = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjNlNDU2Ny1lODliLTEyZDMtYTQ1Ni00MjY2MTQxNzQwMDAiLCJlbWFpbCI6ImRldkB1bmljaGF0LmlvIiwicm9sZSI6IlVTRVIiLCJpYXQiOjE1MTYyMzkwMjJ9.sig';
            setToken(mockJwt, {
              id: '123e4567-e89b-12d3-a456-426614174000',
              email: 'dev@unichat.io',
              systemRole: 'USER',
              status: 'ACTIVE',
            });
            navigate('/workspaces');
          }}
          style={{
            marginTop: '8px',
            background: 'var(--color-surface-container-low, #f1f5f9)',
            color: 'var(--color-on-surface, #0f172a)',
            border: '1px solid var(--color-outline-variant, #cbd5e1)',
            boxShadow: 'none',
          }}
        >
          <Icon name="rocket_launch" size={18} />
          <span>Đăng nhập Nhanh Demo Workspace</span>
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
