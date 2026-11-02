import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { AVATAR_COLOURS } from '../../../components/avatar-colours';
import { AvatarPicker } from './avatar-picker';

import type { UserResponse } from '../../auth/api/auth-api';

// Vitest `globals` tắt toàn dự án nên RTL không tự gắn auto-cleanup.
afterEach(cleanup);

vi.mock('../../auth/api/auth-api', () => ({
  authApi: {
    uploadAvatar: vi.fn(),
    removeAvatar: vi.fn(),
    chooseAvatarColor: vi.fn(),
  },
}));

vi.mock('../../../components/avatar-image-cache', () => ({
  loadAvatar: vi.fn(async () => null),
  forgetAvatar: vi.fn(),
}));

const PROFILE = {
  id: 'u-1',
  email: 'lan.nguyen@iuh.edu.vn',
  displayName: 'Lan Nguyễn',
  systemRole: 'USER',
  status: 'ACTIVE',
  hasAvatar: false,
  avatarColor: null,
} as unknown as UserResponse;

/** Chuyển "rgb(219, 227, 247)" về "#dbe3f7" để so với bảng màu. */
function toHex(rgb: string): string {
  const parts = (rgb.match(/\d+/g) ?? []).slice(0, 3).map(Number);
  return `#${parts.map((n) => n.toString(16).padStart(2, '0')).join('')}`;
}

describe('AvatarPicker', () => {
  it('should paint each swatch in the colour it would actually apply', () => {
    // Arrange — bản trước khai màu riêng trong CSS và ba trong sáu ô cùng trỏ
    // vào var(--muc), nên navy, teal và plum ra một ô đen giống hệt nhau.
    render(<AvatarPicker profile={PROFILE} onChanged={vi.fn()} />);

    // Act
    const swatches = [
      ['Xanh navy', 'navy'],
      ['Xanh ngọc', 'teal'],
      ['Tím mận', 'plum'],
      ['Xanh rêu', 'moss'],
      ['Cam đất', 'clay'],
      ['Xám đá', 'slate'],
    ] as const;

    // Assert
    for (const [label, key] of swatches) {
      const button = screen.getByRole('button', { name: label });
      expect(toHex(button.style.background || button.style.backgroundColor)).toBe(
        AVATAR_COLOURS[key].bg,
      );
    }
  });

  it('should give the six swatches six different colours', () => {
    // Arrange
    render(<AvatarPicker profile={PROFILE} onChanged={vi.fn()} />);

    // Act
    const shown = ['Xanh navy', 'Xanh ngọc', 'Tím mận', 'Xanh rêu', 'Cam đất', 'Xám đá'].map(
      (name) => {
        const button = screen.getByRole('button', { name });
        return toHex(button.style.background || button.style.backgroundColor);
      },
    );

    // Assert
    expect(new Set(shown).size).toBe(6);
  });

  it('should state the upload limits beside the control', () => {
    // Arrange, Act
    render(<AvatarPicker profile={PROFILE} onChanged={vi.fn()} />);

    // Assert
    expect(screen.getByText(/PNG, JPEG hoặc WebP, tối đa 2 MiB/)).toBeInTheDocument();
  });
});
