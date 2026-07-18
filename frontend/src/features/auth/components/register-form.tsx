/**
 * Register form component with full-name, email, password, confirm password.
 */

import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';

import { Icon } from '../../../components/icon';
import { authApi } from '../api/auth-api';
import type { ApiError } from '../../../lib/api-client';
import './register-form.css';

/**
 * Renders the register form with fields and terms checkbox.
 */
export function RegisterForm() {
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const navigate = useNavigate();

  const registerMutation = useMutation({
    mutationFn: authApi.register,
    onSuccess: () => {
      // Navigate to login page on successful registration
      navigate('/login');
    },
    onError: (error: ApiError) => {
      setErrorMsg(error.message || 'Đăng ký thất bại. Vui lòng kiểm tra lại thông tin.');
    },
  });

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setErrorMsg(null);
    
    const formData = new FormData(e.currentTarget);
    const email = formData.get('reg-email') as string;
    const password = formData.get('reg-password') as string;
    const confirmPassword = formData.get('confirm-password') as string;
    
    if (password !== confirmPassword) {
      setErrorMsg('Mật khẩu xác nhận không khớp');
      return;
    }
    
    // Checkbox terms logic could be added here
    const terms = formData.get('terms');
    if (!terms) {
      setErrorMsg('Vui lòng đồng ý với điều khoản sử dụng');
      return;
    }

    registerMutation.mutate({ email, password });
  };

  return (
    <form className="register-form" onSubmit={handleSubmit}>
      {errorMsg && (
        <div className="register-form__error">
          <Icon name="error" size={18} />
          {errorMsg}
        </div>
      )}

      <FormField id="fullname" label="Họ và tên" placeholder="Nhập họ và tên của bạn" type="text" />
      <FormField id="reg-email" label="Email" placeholder="Nhập địa chỉ email" type="email" />
      <FormField id="reg-password" label="Mật khẩu" placeholder="Tạo mật khẩu" type="password" />
      <FormField id="confirm-password" label="Xác nhận mật khẩu" placeholder="Nhập lại mật khẩu" type="password" />

      <div className="register-form__terms">
        <input type="checkbox" id="terms" name="terms" className="register-form__checkbox" />
        <label htmlFor="terms" className="register-form__terms-label">
          Tôi đồng ý với các{' '}
          <a href="#" className="register-form__link">Điều khoản sử dụng</a> và{' '}
          <a href="#" className="register-form__link">Chính sách bảo mật</a> của UniChat.
        </label>
      </div>

      <button 
        className="register-form__submit" 
        type="submit"
        disabled={registerMutation.isPending}
      >
        {registerMutation.isPending ? 'Đang xử lý...' : 'Tạo tài khoản'}
        {!registerMutation.isPending && <Icon name="arrow_forward" size={18} />}
      </button>

      <div className="register-form__footer">
        <span>Đã có tài khoản?</span>
        <Link to="/login" className="register-form__signin-link">Đăng nhập ngay</Link>
      </div>
    </form>
  );
}

function FormField({
  id,
  label,
  placeholder,
  type,
}: {
  readonly id: string;
  readonly label: string;
  readonly placeholder: string;
  readonly type: string;
}) {
  return (
    <div className="register-form__field">
      <label className="register-form__label" htmlFor={id}>{label}</label>
      <input
        className="register-form__input"
        id={id}
        name={id}
        type={type}
        placeholder={placeholder}
        required
      />
    </div>
  );
}
