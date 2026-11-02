import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it } from 'vitest';

import { RegisterForm } from './register-form';

// Vitest `globals` tắt toàn dự án nên RTL không tự gắn auto-cleanup.
afterEach(cleanup);

function draw() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter>
        <RegisterForm />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

const submit = () => screen.getByRole('button', { name: 'Tạo tài khoản' });
const termsBox = () => screen.getByRole('checkbox');

describe('RegisterForm', () => {
  it('should refuse to submit until the terms are agreed to', () => {
    // Arrange, Act: ô đồng ý trước đây không gài gì cả — không required,
    // không khóa nút — nên một tài khoản tạo được mà chưa đồng ý điều gì.
    draw();

    // Assert
    expect(submit()).toBeDisabled();
  });

  it('should let the account be created once they are', () => {
    // Arrange
    draw();

    // Act
    fireEvent.click(termsBox());

    // Assert
    expect(submit()).toBeEnabled();
  });

  it('should lock again if the agreement is taken back', () => {
    // Arrange
    draw();
    fireEvent.click(termsBox());

    // Act
    fireEvent.click(termsBox());

    // Assert
    expect(submit()).toBeDisabled();
  });

  it('should ask for every field the account needs', () => {
    // Arrange, Act
    draw();

    // Assert
    expect(screen.getByLabelText('Họ và tên')).toBeRequired();
    expect(screen.getByLabelText('Email')).toBeRequired();
    expect(screen.getByLabelText('Mật khẩu')).toBeRequired();
    expect(screen.getByLabelText('Xác nhận mật khẩu')).toBeRequired();
  });

  it('should keep the password hidden until asked', () => {
    // Arrange, Act
    draw();

    // Assert
    expect(screen.getByLabelText('Mật khẩu')).toHaveAttribute('type', 'password');
  });

  it('should reveal the password on request, and say which state it is in', () => {
    // Arrange
    draw();

    // Act
    fireEvent.click(screen.getByRole('button', { name: 'Hiện mật khẩu' }));

    // Assert
    expect(screen.getByLabelText('Mật khẩu')).toHaveAttribute('type', 'text');
    expect(screen.getByRole('button', { name: 'Ẩn mật khẩu' })).toBeInTheDocument();
  });

  it('should never reveal the confirmation field, which has no reason to show', () => {
    // Arrange, Act: trường xác nhận tồn tại để bắt lỗi gõ, nên hiện nó ra
    // là bỏ đi lý do nó có mặt.
    draw();

    // Assert
    expect(screen.getByLabelText('Xác nhận mật khẩu')).toHaveAttribute('type', 'password');
    expect(screen.getAllByRole('button', { name: /mật khẩu/ })).toHaveLength(1);
  });
});
