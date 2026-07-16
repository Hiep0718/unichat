import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';

import { Icon } from '../../components/icon';
import { authApi } from './api/auth-api';
import type { ApiError } from '../../lib/api-client';
import './login-page.css';
import './components/login-form.css';

/**
 * ForgotPasswordPage renders a step-based password recovery flow.
 * Step 1: Input registered email to request a 6-digit OTP.
 * Step 2: Input received OTP and a new password (min 12 characters).
 */
function ForgotPasswordPage() {
  const [step, setStep] = useState<1 | 2>(1);
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const navigate = useNavigate();

  // Mutation to request OTP code
  const requestOtpMutation = useMutation({
    mutationFn: authApi.forgotPassword,
    onSuccess: () => {
      setSuccessMsg('Mã OTP đã được gửi thành công. Vui lòng kiểm tra log console của Backend.');
      setErrorMsg(null);
      setStep(2);
    },
    onError: (error: ApiError) => {
      setErrorMsg(error.message || 'Yêu cầu gửi mã OTP thất bại. Vui lòng kiểm tra lại email.');
      setSuccessMsg(null);
    },
  });

  // Mutation to verify OTP & reset password
  const resetPasswordMutation = useMutation({
    mutationFn: authApi.resetPassword,
    onSuccess: () => {
      setSuccessMsg('Đặt lại mật khẩu thành công. Hệ thống đang chuyển hướng về trang đăng nhập...');
      setErrorMsg(null);
      setTimeout(() => {
        navigate('/login');
      }, 3000);
    },
    onError: (error: ApiError) => {
      setErrorMsg(error.message || 'Mã OTP không chính xác hoặc đã hết hạn.');
      setSuccessMsg(null);
    },
  });

  const handleRequestOtp = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    const emailTrimmed = email.trim();
    if (!emailTrimmed) {
      setErrorMsg('Vui lòng nhập địa chỉ email.');
      return;
    }

    requestOtpMutation.mutate({ email: emailTrimmed });
  };

  const handleResetPassword = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    const otpTrimmed = otp.trim();
    if (!otpTrimmed || otpTrimmed.length !== 6) {
      setErrorMsg('Mã OTP phải có đúng 6 ký số.');
      return;
    }
    if (!newPassword) {
      setErrorMsg('Mật khẩu mới không được để trống.');
      return;
    }
    if (newPassword.length < 12 || newPassword.length > 128) {
      setErrorMsg('Mật khẩu mới phải từ 12 đến 128 ký tự.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setErrorMsg('Mật khẩu xác nhận không trùng khớp.');
      return;
    }

    resetPasswordMutation.mutate({
      email: email.trim(),
      otp: otpTrimmed,
      newPassword,
    });
  };

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

        <div className="login-card">
          <div className="login-card__header">
            <h2 className="login-card__title">Khôi phục mật khẩu</h2>
            <p className="login-card__subtitle">
              {step === 1 
                ? 'Nhập email của bạn để nhận mã xác thực OTP' 
                : 'Nhập mã OTP được gửi tới email và mật khẩu mới'}
            </p>
          </div>

          {errorMsg && (
            <div className="login-form__error" role="alert">
              <Icon name="error" size={18} />
              <span>{errorMsg}</span>
            </div>
          )}

          {successMsg && (
            <div className="login-form__error" style={{ background: '#ecfdf5', color: '#065f46', border: '1px solid #a7f3d0' }} role="status">
              <Icon name="check_circle" size={18} style={{ color: '#10b981' }} />
              <span>{successMsg}</span>
            </div>
          )}

          {step === 1 ? (
            <form className="login-form" onSubmit={handleRequestOtp}>
              <div className="login-form__field">
                <label className="login-form__label" htmlFor="reset-email">Email tài khoản</label>
                <div className="login-form__input-wrap">
                  <Icon name="mail" size={20} className="login-form__icon" />
                  <input
                    className="login-form__input login-form__input--icon"
                    id="reset-email"
                    type="email"
                    placeholder="Nhập địa chỉ email của bạn"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    disabled={requestOtpMutation.isPending}
                  />
                </div>
              </div>

              <button
                className="login-form__submit"
                type="submit"
                disabled={requestOtpMutation.isPending}
              >
                {requestOtpMutation.isPending ? 'Đang gửi yêu cầu...' : 'Gửi mã OTP'}
                {!requestOtpMutation.isPending && <Icon name="arrow_forward" size={18} />}
              </button>
            </form>
          ) : (
            <form className="login-form" onSubmit={handleResetPassword}>
              <div className="login-form__field">
                <label className="login-form__label" htmlFor="otp-code">Mã xác thực OTP</label>
                <div className="login-form__input-wrap">
                  <Icon name="password" size={20} className="login-form__icon" />
                  <input
                    className="login-form__input login-form__input--icon"
                    id="otp-code"
                    type="text"
                    placeholder="Nhập 6 ký số OTP"
                    value={otp}
                    onChange={(e) => setOtp(e.target.value)}
                    required
                    maxLength={6}
                    disabled={resetPasswordMutation.isPending}
                  />
                </div>
              </div>

              <div className="login-form__field">
                <label className="login-form__label" htmlFor="new-password">Mật khẩu mới</label>
                <div className="login-form__input-wrap">
                  <Icon name="lock" size={20} className="login-form__icon" />
                  <input
                    className="login-form__input login-form__input--icon login-form__input--password"
                    id="new-password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Nhập mật khẩu mới từ 12-128 ký tự"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    required
                    disabled={resetPasswordMutation.isPending}
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

              <div className="login-form__field">
                <label className="login-form__label" htmlFor="confirm-password">Xác nhận mật khẩu mới</label>
                <div className="login-form__input-wrap">
                  <Icon name="lock" size={20} className="login-form__icon" />
                  <input
                    className="login-form__input login-form__input--icon login-form__input--password"
                    id="confirm-password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Nhập lại mật khẩu mới"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    disabled={resetPasswordMutation.isPending}
                  />
                </div>
              </div>

              <button
                className="login-form__submit"
                type="submit"
                disabled={resetPasswordMutation.isPending}
              >
                {resetPasswordMutation.isPending ? 'Đang cập nhật mật khẩu...' : 'Xác nhận thay đổi'}
                {!resetPasswordMutation.isPending && <Icon name="check" size={18} />}
              </button>
            </form>
          )}

          <div className="login-card__footer">
            <p>
              Quay lại trang{' '}
              <Link to="/login" className="login-card__link">Đăng nhập</Link>
            </p>
          </div>
        </div>

        <div className="login-page__badge">
          <Icon name="security" size={16} className="login-page__badge-icon" />
          <span>Tài khoản của bạn được bảo vệ bằng xác thực JWT</span>
        </div>
      </main>
    </div>
  );
}

export default ForgotPasswordPage;
