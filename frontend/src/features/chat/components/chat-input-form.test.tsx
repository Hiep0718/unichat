import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ChatInputForm } from './chat-input-form';

describe('ChatInputForm', () => {
  afterEach(cleanup);

  it('should connect document-mode composer controls to the styled layout', () => {
    render(<ChatInputForm onSend={vi.fn()} loading={false} />);

    expect(screen.getByRole('button', { name: /Chỉ theo Tài liệu/ }))
      .toHaveClass('chat-input-form__context-indicator--strict');
    expect(screen.getByLabelText('Câu hỏi tri thức')).toHaveClass('chat-input-form__field');
    expect(screen.getByRole('button', { name: 'Gửi câu hỏi' })).toHaveClass('chat-input-form__submit-btn');
  });

  it('should send the question and expose expanded mode styling when selected', () => {
    const onSend = vi.fn();
    render(<ChatInputForm onSend={onSend} loading={false} />);
    fireEvent.change(screen.getByLabelText('Câu hỏi tri thức'), { target: { value: 'Giải thích RAG' } });
    fireEvent.click(screen.getByRole('button', { name: /Chỉ theo Tài liệu/ }));

    expect(screen.getByRole('button', { name: /RAG \+ AI Mở rộng/ }))
      .toHaveClass('chat-input-form__context-indicator--hybrid');
    fireEvent.click(screen.getByRole('button', { name: 'Gửi câu hỏi' }));
    expect(onSend).toHaveBeenCalledWith('Giải thích RAG', true);
  });

  it('should block clicks and form submission when workspace AI is disabled', () => {
    const onSend = vi.fn();
    const { container } = render(<ChatInputForm onSend={onSend} loading={false} disabled />);
    expect(screen.getByLabelText('Câu hỏi tri thức')).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Gửi câu hỏi' })).toBeDisabled();
    fireEvent.change(screen.getByLabelText('Câu hỏi tri thức'), { target: { value: 'Giải thích RAG' } });
    fireEvent.submit(container.querySelector('form')!);
    expect(onSend).not.toHaveBeenCalled();
  });
});
