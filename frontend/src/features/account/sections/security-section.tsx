import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';

import { Icon } from '../../../components/icon';
import { settingsApi } from '../settings-api';

import type { ApiError } from '../../../lib/api-client';

/** Giới hạn do Core API đặt ra (`ChangePasswordRequest`). */
const MIN = 12;
const MAX = 128;

/**
 * Khu vực "Bảo mật": đổi mật khẩu.
 *
 * Bản trước còn một danh sách "Thiết bị & Phiên đăng nhập" liệt kê
 * "MacBook Pro - Chrome" và "iPhone 13 - Safari" ở "Hà Nội, Việt Nam", kèm
 * nút đăng xuất khỏi từng máy. Không có gì trong đó là thật: các dòng ấy viết
 * cứng trong mã, không hề hỏi máy chủ, và các nút không nối vào đâu cả. Một
 * màn bảo mật bịa ra thông tin về chính bảo mật của người dùng thì tệ hơn là
 * không có màn đó, nên nó đã bị gỡ. Khi nào Core API có endpoint phiên đăng
 * nhập thì dựng lại từ dữ liệu thật.
 */
export function SecuritySection() {
  const [open, setOpen] = useState(false);

  return (
    <section className="settings-card">
      <h2 className="settings-card__title">Bảo mật</h2>
      <p className="settings-card__note">Mật khẩu dùng để đăng nhập vào UniChat.</p>

      <div className="settings-row">
        <span className="settings-row__mark" aria-hidden="true">
          <Icon name="lock" size={18} />
        </span>
        <span className="settings-row__text">
          <span className="settings-row__name">Mật khẩu</span>
          <span className="settings-row__meta">
            Dùng {MIN}–{MAX} ký tự
          </span>
        </span>
        <button
          type="button"
          className="settings-row__action"
          onClick={() => setOpen((was) => !was)}
          aria-expanded={open}
        >
          {open ? 'Đóng' : 'Đổi mật khẩu'}
        </button>
      </div>

      {open && <PasswordForm onDone={() => setOpen(false)} />}
    </section>
  );
}

/** Biểu mẫu đổi mật khẩu, chỉ dựng khi người dùng mở nó ra. */
function PasswordForm({ onDone }: { readonly onDone: () => void }) {
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [again, setAgain] = useState('');
  const [problem, setProblem] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const change = useMutation({
    mutationFn: settingsApi.changePassword,
    onSuccess: () => {
      setDone(true);
      setProblem(null);
      setCurrent('');
      setNext('');
      setAgain('');
    },
    onError: (error: ApiError) => {
      setProblem(error.message || 'Cập nhật mật khẩu thất bại.');
      setDone(false);
    },
  });

  /** Kiểm tại chỗ trước khi gọi máy chủ; máy chủ vẫn kiểm lại y hệt. */
  const check = (): string | null => {
    if (!current) return 'Chưa nhập mật khẩu hiện tại.';
    if (next.length < MIN || next.length > MAX) {
      return `Mật khẩu mới phải từ ${MIN} đến ${MAX} ký tự.`;
    }
    if (next !== again) return 'Hai lần nhập mật khẩu mới không khớp.';
    return null;
  };

  return (
    <form
      className="settings-pwd"
      onSubmit={(event) => {
        event.preventDefault();
        setDone(false);
        const bad = check();
        setProblem(bad);
        if (!bad) change.mutate({ currentPassword: current, newPassword: next });
      }}
    >
      <PasswordField id="pwd-current" label="Mật khẩu hiện tại" value={current} onChange={setCurrent} />
      <PasswordField
        id="pwd-next"
        label="Mật khẩu mới"
        value={next}
        onChange={setNext}
        describedBy="pwd-rule"
      />
      <p className="settings-field__hint" id="pwd-rule">
        Từ {MIN} đến {MAX} ký tự.
      </p>
      <PasswordField id="pwd-again" label="Nhập lại mật khẩu mới" value={again} onChange={setAgain} />

      {problem && (
        <p className="settings-field__hint settings-field__hint--bad" role="alert">
          {problem}
        </p>
      )}
      {done && (
        <p className="settings-field__hint settings-field__hint--good" role="status">
          Đã cập nhật mật khẩu.
        </p>
      )}

      <div className="settings-pwd__actions">
        <button type="submit" className="settings-field__save" disabled={change.isPending}>
          {change.isPending ? 'Đang lưu…' : 'Cập nhật mật khẩu'}
        </button>
        <button type="button" className="settings-pwd__cancel" onClick={onDone}>
          Hủy
        </button>
      </div>
    </form>
  );
}

/** Một ô mật khẩu với nhãn nằm trên, theo đúng khuôn của các ô khác. */
function PasswordField({
  id,
  label,
  value,
  onChange,
  describedBy,
}: {
  readonly id: string;
  readonly label: string;
  readonly value: string;
  readonly onChange: (next: string) => void;
  readonly describedBy?: string;
}) {
  return (
    <div className="settings-field">
      <label className="settings-field__label" htmlFor={id}>
        {label}
      </label>
      <input
        id={id}
        type="password"
        className="settings-field__input"
        value={value}
        autoComplete={id === 'pwd-current' ? 'current-password' : 'new-password'}
        {...(describedBy ? { 'aria-describedby': describedBy } : {})}
        onChange={(event) => onChange(event.target.value)}
      />
    </div>
  );
}
