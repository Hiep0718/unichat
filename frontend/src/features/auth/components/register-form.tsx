/**
 * Register form component with full-name, email, password, confirm password.
 */

import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';

import { Icon } from '../../../components/icon';
import { authApi } from '../api/auth-api';
import { RETURN_PARAM, withReturnTo } from '../return-to';
import type { ApiError } from '../../../lib/api-client';
import './register-form.css';

/**
 * Renders the register form with fields and terms checkbox.
 */
/**
 * Độ dài mật khẩu tối thiểu.
 *
 * Con số này thuộc về Core API: RegisterRequest đánh @Size(min = 12). Mobile
 * đã kiểm đúng 12; web thì không kiểm gì cả, và có lúc còn ghi "ít nhất 8
 * ký tự" trên ô nhập — tức nói với người dùng một điều máy chủ sẽ từ chối.
 */
const MIN_PASSWORD = 12;

export function RegisterForm() {
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [agreed, setAgreed] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const returnTo = searchParams.get(RETURN_PARAM);

  const registerMutation = useMutation({
    mutationFn: authApi.register,
    onSuccess: () => {
      // Carries the destination on, so someone who registered in order to
      // accept an invitation returns to it instead of losing it at sign-in.
      navigate(withReturnTo('/login', returnTo));
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
    
    // Khớp với @Size(min = 12) trên RegisterRequest của Core API. Không kiểm
    // ở đây thì người dùng phải đợi một vòng mạng mới biết mật khẩu quá
    // ngắn — và lúc đó thông báo là của máy chủ, không gắn vào ô nào cả.
    if (password.length < MIN_PASSWORD) {
      setErrorMsg(`Mật khẩu phải từ ${MIN_PASSWORD} ký tự trở lên`);
      return;
    }

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

      <FormField id="fullname" label="Họ và tên" placeholder="Nguyễn Văn An" type="text" icon="person" />
      <FormField id="reg-email" label="Email" placeholder="ban@truong.edu.vn" type="email" icon="mail" />
      <FormField
        id="reg-password"
        label="Mật khẩu"
        placeholder="Ít nhất 12 ký tự"
        type={showPassword ? 'text' : 'password'}
        icon="lock"
        onToggle={() => setShowPassword((on) => !on)}
        toggled={showPassword}
      />
      <FormField
        id="confirm-password"
        label="Xác nhận mật khẩu"
        placeholder="Nhập lại mật khẩu"
        type="password"
        icon="shield"
      />

      <div className="register-form__terms">
        {/* Ô này trước đây không gài gì cả: không required, không khóa nút,
            nên ai cũng đăng ký được mà chưa đồng ý điều khoản. Một ô đồng ý
            không gài gì thì không phải một sự đồng ý. */}
        <input
          type="checkbox"
          id="terms"
          name="terms"
          className="register-form__checkbox"
          checked={agreed}
          onChange={(event) => setAgreed(event.target.checked)}
        />
        <label htmlFor="terms" className="register-form__terms-label">
          Tôi đồng ý với các{' '}
          <a href="#" className="register-form__link">Điều khoản sử dụng</a> và{' '}
          <a href="#" className="register-form__link">Chính sách bảo mật</a> của UniChat.
        </label>
      </div>

      <button 
        className="register-form__submit" 
        type="submit"
        disabled={registerMutation.isPending || !agreed}
      >
        {registerMutation.isPending ? 'Đang xử lý...' : 'Tạo tài khoản'}
      </button>

      <div className="register-form__footer">
        <span>Đã có tài khoản?</span>
        <Link to="/login" className="register-form__signin-link">Đăng nhập ngay</Link>
      </div>
    </form>
  );
}

interface FormFieldProps {
  readonly id: string;
  readonly label: string;
  readonly placeholder: string;
  readonly type: string;
  /** Tên biểu tượng đặt ở đầu ô nhập. */
  readonly icon: string;
  /** Có thì ô hiện thêm nút bật/tắt nhìn thấy mật khẩu. */
  readonly onToggle?: (() => void) | undefined;
  readonly toggled?: boolean | undefined;
}

function FormField({ id, label, placeholder, type, icon, onToggle, toggled }: FormFieldProps) {
  return (
    <div className="register-form__field">
      <label className="register-form__label" htmlFor={id}>{label}</label>
      <div className="register-form__input-wrap">
        <Icon name={icon} size={19} className="register-form__input-icon" />
        <input
          className="register-form__input"
          id={id}
          name={id}
          type={type}
          placeholder={placeholder}
          required
        />
        {onToggle && (
          <button
            type="button"
            className="register-form__toggle"
            onClick={onToggle}
            aria-label={toggled ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
            aria-pressed={toggled}
          >
            <Icon name={toggled ? 'visibility_off' : 'visibility'} size={19} />
          </button>
        )}
      </div>
    </div>
  );
}
