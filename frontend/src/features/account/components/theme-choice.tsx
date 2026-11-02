import { useState } from 'react';

import { readThemeChoice, setThemeChoice } from '../../../lib/theme';

import type { ThemeChoice as Choice } from '../../../lib/theme';

import './theme-choice.css';

interface Option {
  readonly value: Choice;
  readonly label: string;
  readonly hint: string;
}

const OPTIONS: readonly Option[] = [
  { value: 'light', label: 'Sáng', hint: 'Luôn dùng nền sáng' },
  { value: 'dark', label: 'Tối', hint: 'Luôn dùng nền tối' },
  { value: 'system', label: 'Theo hệ thống', hint: 'Đi theo thiết lập của máy' },
];

/**
 * Cho người dùng chọn giữa nền sáng, nền tối và theo hệ thống.
 *
 * Trạng thái khởi tạo đọc từ lưu trữ chứ không mặc định 'system', để ô đang
 * chọn khớp với thứ đang hiển thị ngay từ lần vẽ đầu.
 */
export function ThemeChoice() {
  const [choice, setChoice] = useState<Choice>(() => readThemeChoice());

  const pick = (value: Choice) => {
    setThemeChoice(value);
    setChoice(value);
  };

  return (
    <div className="theme-choice" role="radiogroup" aria-label="Chế độ hiển thị">
      {OPTIONS.map((option) => (
        <button
          key={option.value}
          type="button"
          role="radio"
          aria-checked={choice === option.value}
          className={`theme-choice__option${
            choice === option.value ? ' theme-choice__option--active' : ''
          }`}
          onClick={() => pick(option.value)}
        >
          <ThemePreview value={option.value} />
          <span className="theme-choice__label">{option.label}</span>
          <span className="theme-choice__hint">{option.hint}</span>
        </button>
      ))}
    </div>
  );
}

/**
 * Ô xem trước: một màn hình thu nhỏ với thanh bên và vài dòng nội dung.
 *
 * Vẽ bằng các khối có sẵn chứ không phải ảnh chụp, nên nó không bao giờ lệch
 * với giao diện thật khi bảng màu đổi. Ô "theo hệ thống" cắt chéo làm đôi để
 * nói rằng nó có thể ra một trong hai.
 */
function ThemePreview({ value }: { readonly value: Choice }) {
  return (
    <span className={`theme-preview theme-preview--${value}`} aria-hidden="true">
      <span className="theme-preview__rail" />
      <span className="theme-preview__body">
        <span className="theme-preview__bar theme-preview__bar--wide" />
        <span className="theme-preview__bar" />
      </span>
    </span>
  );
}
