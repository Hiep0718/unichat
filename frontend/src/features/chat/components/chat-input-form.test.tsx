import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { ChatInputForm } from './chat-input-form';

describe('ChatInputForm', () => {
  it('should keep the field label for screen readers only', () => {
    // `.sr-only` was referenced here and defined nowhere, so the label meant
    // for assistive technology was printed above the field as body text.
    render(<ChatInputForm onSend={vi.fn()} loading={false} />);

    expect(screen.getByLabelText('Câu hỏi tri thức')).toBeInTheDocument();
    expect(screen.getByText('Câu hỏi tri thức')).toHaveClass('sr-only');
  });

  it('should refuse to send until there is a question worth sending', async () => {
    const onSend = vi.fn();
    render(<ChatInputForm onSend={onSend} loading={false} />);

    const send = screen.getByRole('button', { name: 'Gửi' });
    expect(send).toBeDisabled();

    await userEvent.type(screen.getByLabelText('Câu hỏi tri thức'), 'ab');
    expect(send).toBeDisabled();

    await userEvent.type(screen.getByLabelText('Câu hỏi tri thức'), 'c');
    expect(send).toBeEnabled();
  });

  it('should style the send button rather than leave it a browser default', async () => {
    // The markup carried no classes at all, so the stylesheet describing this
    // button never reached it and it rendered as a plain grey bar.
    render(<ChatInputForm onSend={vi.fn()} loading={false} />);

    const send = screen.getByRole('button', { name: 'Gửi' });
    expect(send).toHaveClass('chat-input-form__submit-btn');
    expect(send).not.toHaveClass('chat-input-form__submit-btn--active');

    await userEvent.type(screen.getByLabelText('Câu hỏi tri thức'), 'MongoDB là gì');
    expect(send).toHaveClass('chat-input-form__submit-btn--active');
  });

  it('should hand the question over and clear the field', async () => {
    const onSend = vi.fn();
    render(<ChatInputForm onSend={onSend} loading={false} />);

    const field = screen.getByLabelText('Câu hỏi tri thức');
    await userEvent.type(field, 'MongoDB là gì');
    await userEvent.click(screen.getByRole('button', { name: 'Gửi' }));

    expect(onSend).toHaveBeenCalledWith('MongoDB là gì', false);
    expect(field).toHaveValue('');
  });

  it('should offer to stop instead of to send while an answer is coming', () => {
    const onCancel = vi.fn();
    render(<ChatInputForm onSend={vi.fn()} loading onCancel={onCancel} />);

    expect(screen.getByRole('button', { name: 'Dừng' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Gửi' })).not.toBeInTheDocument();
  });

  it('should say which sources an answer may draw on, and change it with the mode', async () => {
    render(<ChatInputForm onSend={vi.fn()} loading={false} />);

    expect(screen.getByText('Câu trả lời chỉ dùng tài liệu được cấp quyền.')).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: /Chỉ theo Tài liệu/ }));

    expect(
      screen.getByText(/Phần kiến thức mở rộng được ghi nhãn riêng/),
    ).toBeInTheDocument();
  });
});
