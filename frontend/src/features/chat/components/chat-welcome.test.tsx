import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { ChatWelcome } from './chat-welcome';
import type { DocumentResponse } from '../../documents/document-api';

// Vitest `globals` tắt toàn dự án nên RTL không tự gắn auto-cleanup.
afterEach(cleanup);

/** Một tài liệu rút gọn: màn này chỉ đếm số lượng, không đọc trường nào. */
const doc = () => ({}) as DocumentResponse;

describe('ChatWelcome', () => {
  it('should name the knowledge base as the screen title', () => {
    // Arrange, Act
    render(<ChatWelcome workspaceName="Mongodb" onSelectPrompt={vi.fn()} />);

    // Assert
    expect(screen.getByRole('heading', { level: 1, name: 'Mongodb' })).toBeInTheDocument();
  });

  it('should say how many documents are in scope', () => {
    // Arrange, Act
    render(<ChatWelcome documents={[doc(), doc(), doc()]} onSelectPrompt={vi.fn()} />);

    // Assert
    expect(screen.getByText(/3 tài liệu/)).toBeInTheDocument();
  });

  it('should still read correctly when the workspace holds nothing yet', () => {
    // Arrange, Act: một kho rỗng là trạng thái thật, không phải lỗi tải.
    render(<ChatWelcome onSelectPrompt={vi.fn()} />);

    // Assert
    expect(screen.getByText(/0 tài liệu/)).toBeInTheDocument();
  });

  it('should state the evidence contract, including the refusal half of it', () => {
    // Arrange, Act: từ chối khi thiếu bằng chứng là tính năng P0 của sản
    // phẩm, nên màn mở đầu phải nói ra, không chỉ hứa phần dễ nghe.
    render(<ChatWelcome onSelectPrompt={vi.fn()} />);

    // Assert
    expect(screen.getByText(/chưa trả lời được/)).toBeInTheDocument();
  });

  it('should send the full question when a prompt is chosen, not its label', () => {
    // Arrange: nhãn ngắn để mắt quét, câu hỏi đầy đủ mới là thứ gửi đi.
    const onSelectPrompt = vi.fn();
    render(<ChatWelcome onSelectPrompt={onSelectPrompt} />);

    // Act
    fireEvent.click(screen.getByText('So sánh'));

    // Assert
    expect(onSelectPrompt).toHaveBeenCalledWith(
      'So sánh các phương pháp được trình bày trong tài liệu.',
    );
  });

  it('should offer every prompt as a real button a keyboard can reach', () => {
    // Arrange, Act
    render(<ChatWelcome onSelectPrompt={vi.fn()} />);

    // Assert
    expect(screen.getAllByRole('button')).toHaveLength(4);
  });

  it('should carry no icons and no emoji', () => {
    // Arrange, Act: ô biểu tượng nhuộm màu là thứ bộ phong cách cấm, và dòng
    // đếm tài liệu từng mở đầu bằng một emoji sót lại.
    const { container } = render(<ChatWelcome onSelectPrompt={vi.fn()} />);

    // Assert
    expect(container.querySelector('.material-symbols-outlined')).toBeNull();
    expect(container.textContent).not.toMatch(/\p{Extended_Pictographic}/u);
  });
});
