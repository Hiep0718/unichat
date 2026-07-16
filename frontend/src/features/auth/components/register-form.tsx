/**
 * Register form component with full-name, email, password, confirm password.
 */

import { Link } from 'react-router-dom';

import { Icon } from '../../../components/icon';
import './register-form.css';

/**
 * Renders the register form with fields and terms checkbox.
 */
export function RegisterForm() {
  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    // TODO: wire to auth API
  };

  return (
    <form className="register-form" onSubmit={handleSubmit}>
      <FormField id="fullname" label="Họ và tên" placeholder="Nhập họ và tên của bạn" type="text" />
      <FormField id="reg-email" label="Email" placeholder="Nhập địa chỉ email" type="email" />
      <FormField id="reg-password" label="Mật khẩu" placeholder="Tạo mật khẩu" type="password" />
      <FormField id="confirm-password" label="Xác nhận mật khẩu" placeholder="Nhập lại mật khẩu" type="password" />

      <div className="register-form__terms">
        <input type="checkbox" id="terms" className="register-form__checkbox" />
        <label htmlFor="terms" className="register-form__terms-label">
          Tôi đồng ý với các{' '}
          <a href="#" className="register-form__link">Điều khoản sử dụng</a> và{' '}
          <a href="#" className="register-form__link">Chính sách bảo mật</a> của UniChat.
        </label>
      </div>

      <button className="register-form__submit" type="submit">
        Tạo tài khoản
        <Icon name="arrow_forward" size={18} />
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
