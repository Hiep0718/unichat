import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ChatInputForm } from './chat-input-form';

const field = () => screen.getByLabelText('Câu hỏi tri thức');

describe('ChatInputForm', () => {
  afterEach(cleanup);

  it('should start in strict document-only mode with a multi-line field and a disabled send button', () => {
    render(<ChatInputForm onSend={vi.fn()} loading={false} />);

    expect(screen.getByRole('radio', { name: /Chỉ tài liệu/ })).toHaveAttribute('aria-checked', 'true');
    expect(field().tagName).toBe('TEXTAREA');
    expect(screen.getByRole('button', { name: 'Gửi câu hỏi' })).toBeDisabled();
    expect(screen.getByText(/Chỉ trả lời từ tài liệu bạn được cấp quyền/)).toBeInTheDocument();
  });

  it('should not render a hardcoded workspace summary button', () => {
    render(<ChatInputForm onSend={vi.fn()} loading={false} />);

    expect(screen.queryByRole('button', { name: /Tóm tắt toàn bộ tài liệu/ })).not.toBeInTheDocument();
  });

  it('should adapt placeholder and corpus scope badge to workspace context', () => {
    const { rerender } = render(
      <ChatInputForm onSend={vi.fn()} loading={false} workspaceName="Kiến trúc hệ thống"
        readySourceCount={6} totalSourceCount={6} />,
    );

    expect(field()).toHaveAttribute('placeholder', expect.stringContaining('Kiến trúc hệ thống'));
    expect(screen.getByText('6 nguồn tài liệu')).toBeInTheDocument();

    rerender(<ChatInputForm onSend={vi.fn()} loading={false} readySourceCount={3} totalSourceCount={5} />);
    expect(screen.getByText('3/5 nguồn sẵn sàng')).toBeInTheDocument();

    rerender(<ChatInputForm onSend={vi.fn()} loading={false} readySourceCount={0} totalSourceCount={0} />);
    expect(screen.getByText('Chưa có nguồn')).toBeInTheDocument();
  });

  it('should send a summary request typed in natural language as an ordinary question', () => {
    const onSend = vi.fn();
    render(<ChatInputForm onSend={onSend} loading={false} />);

    fireEvent.change(field(), { target: { value: '  Tóm tắt toàn bộ tài liệu  ' } });
    fireEvent.keyDown(field(), { key: 'Enter' });

    expect(onSend).toHaveBeenCalledWith('Tóm tắt toàn bộ tài liệu', false);
    expect(field()).toHaveValue('');
  });

  it('should insert a new line instead of sending on Shift+Enter or during IME composition', () => {
    const onSend = vi.fn();
    render(<ChatInputForm onSend={onSend} loading={false} />);

    fireEvent.change(field(), { target: { value: 'Giải thích RAG' } });
    fireEvent.keyDown(field(), { key: 'Enter', shiftKey: true });
    fireEvent.keyDown(field(), { key: 'Enter', isComposing: true });

    expect(onSend).not.toHaveBeenCalled();
  });

  it('should explain minimum length when fewer than three characters are typed', () => {
    render(<ChatInputForm onSend={vi.fn()} loading={false} />);

    fireEvent.change(field(), { target: { value: 'AI' } });

    expect(screen.getByText('Tối thiểu 3 ký tự')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Gửi câu hỏi' })).toBeDisabled();
  });

  it('should send with expanded knowledge after switching the scope', () => {
    const onSend = vi.fn();
    render(<ChatInputForm onSend={onSend} loading={false} />);

    fireEvent.click(screen.getByRole('radio', { name: /Mở rộng/ }));
    fireEvent.change(field(), { target: { value: 'Giải thích RAG' } });
    fireEvent.click(screen.getByRole('button', { name: 'Gửi câu hỏi' }));

    expect(screen.getByRole('radio', { name: /Mở rộng/ })).toHaveAttribute('aria-checked', 'true');
    expect(onSend).toHaveBeenCalledWith('Giải thích RAG', true);
  });

  it('should keep the draft editable and expose only the stop action while an answer is loading', () => {
    const onSend = vi.fn();
    const onCancel = vi.fn();
    render(<ChatInputForm onSend={onSend} loading onCancel={onCancel} />);

    fireEvent.change(field(), { target: { value: 'Câu hỏi tiếp theo' } });
    fireEvent.keyDown(field(), { key: 'Enter' });
    fireEvent.click(screen.getByRole('button', { name: 'Dừng tạo câu trả lời' }));

    expect(field()).not.toBeDisabled();
    expect(onSend).not.toHaveBeenCalled();
    expect(onCancel).toHaveBeenCalledOnce();
  });

  it('should show the character counter only near the limit', () => {
    render(<ChatInputForm onSend={vi.fn()} loading={false} />);
    expect(screen.queryByText(/\/2\.000/)).not.toBeInTheDocument();

    fireEvent.change(field(), { target: { value: 'a'.repeat(1700) } });

    expect(screen.getByText('1.700/2.000')).toBeInTheDocument();
  });

  it('should block clicks and form submission when workspace AI is disabled', () => {
    const onSend = vi.fn();
    const { container } = render(<ChatInputForm onSend={onSend} loading={false} disabled />);
    expect(field()).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Gửi câu hỏi' })).toBeDisabled();
    fireEvent.change(field(), { target: { value: 'Giải thích RAG' } });
    fireEvent.submit(container.querySelector('form')!);
    expect(onSend).not.toHaveBeenCalled();
  });
});
