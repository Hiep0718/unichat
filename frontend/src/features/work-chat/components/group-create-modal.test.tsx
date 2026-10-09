import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { GroupCreateModal } from './group-create-modal';
import * as api from '../work-chat-api';
import type { Contact } from '../work-chat-api';

// Vitest `globals` is disabled project-wide, so RTL auto-cleanup is not installed.
afterEach(cleanup);
afterEach(() => vi.restoreAllMocks());

const contacts: Contact[] = [
  { userId: 'u2', name: 'Minh Anh', sharedGroup: 'Lớp K21' },
  { userId: 'u3', name: 'Quốc Bảo', sharedGroup: 'Lớp K21' },
];

function withContacts(list: Contact[] = contacts) {
  return vi.spyOn(api, 'fetchContacts').mockResolvedValue(list);
}

/** Indexed lookup that fails loudly rather than returning undefined. */
function checkboxAt(index: number): HTMLElement {
  const box = screen.getAllByRole('checkbox')[index];
  if (!box) {
    throw new Error(`Không có checkbox thứ ${index}`);
  }
  return box;
}

describe('GroupCreateModal', () => {
  it('should refuse to create a group with no name and nobody in it', async () => {
    // Arrange
    withContacts();
    render(<GroupCreateModal onCreate={vi.fn()} onClose={vi.fn()} />);
    await screen.findByText('Minh Anh');

    // Assert
    expect(screen.getByRole('button', { name: 'Tạo nhóm' })).toBeDisabled();
  });

  it('should still refuse once named, until someone is chosen', async () => {
    // Arrange
    withContacts();
    render(<GroupCreateModal onCreate={vi.fn()} onClose={vi.fn()} />);
    await screen.findByText('Minh Anh');

    // Act
    await userEvent.type(screen.getByLabelText('Tên nhóm'), 'Nhóm đồ án');

    // Assert
    expect(screen.getByRole('button', { name: 'Tạo nhóm' })).toBeDisabled();
  });

  it('should create the group with exactly the people chosen', async () => {
    // Arrange
    withContacts();
    const onCreate = vi.fn().mockResolvedValue(undefined);
    render(<GroupCreateModal onCreate={onCreate} onClose={vi.fn()} />);
    await screen.findByText('Minh Anh');

    // Act
    await userEvent.type(screen.getByLabelText('Tên nhóm'), '  Nhóm đồ án  ');
    await userEvent.click(checkboxAt(1));
    await userEvent.click(screen.getByRole('button', { name: 'Tạo nhóm' }));

    // Assert: the name is trimmed, and the caller is not in the list — the
    // server makes them the owner by virtue of creating it.
    expect(onCreate).toHaveBeenCalledWith('Nhóm đồ án', ['u3']);
  });

  it('should let a chosen person be unchosen again', async () => {
    // Arrange
    withContacts();
    render(<GroupCreateModal onCreate={vi.fn()} onClose={vi.fn()} />);
    await screen.findByText('Minh Anh');
    const checkbox = checkboxAt(0);

    // Act
    await userEvent.click(checkbox);
    await userEvent.click(checkbox);

    // Assert
    expect(screen.getByText('Đã chọn 0 người')).toBeInTheDocument();
  });

  it('should stop one short of the ceiling, since the creator counts too', async () => {
    // Arrange
    const crowd: Contact[] = Array.from({ length: api.MAX_GROUP_PARTICIPANTS }, (_, index) => ({
      userId: `u${index}`,
      name: `Người ${index}`,
      sharedGroup: 'Lớp K21',
    }));
    withContacts(crowd);
    render(<GroupCreateModal onCreate={vi.fn()} onClose={vi.fn()} />);
    await screen.findByText('Người 0');
    // Act: pick the maximum, then try one more. fireEvent rather than
    // userEvent here only for speed — fifty simulated pointer sequences take
    // longer than the test budget, and the behaviour under test is the change
    // handler, not the pointer.
    const boxes = screen.getAllByRole("checkbox");
    for (const box of boxes.slice(0, api.MAX_GROUP_PARTICIPANTS - 1)) {
      fireEvent.click(box);
    }
    fireEvent.click(checkboxAt(api.MAX_GROUP_PARTICIPANTS - 1));

    // Assert
    expect(screen.getByRole('alert')).toHaveTextContent(/tối đa 50 người/);
    expect(screen.getByText(`Đã chọn ${api.MAX_GROUP_PARTICIPANTS - 1} người`))
      .toBeInTheDocument();
  });

  it('should show the reason when the server refuses the group', async () => {
    // Arrange
    withContacts();
    const onCreate = vi.fn().mockRejectedValue(
      new Error('Chỉ thêm được thành viên cùng nhóm với bạn'));
    render(<GroupCreateModal onCreate={onCreate} onClose={vi.fn()} />);
    await screen.findByText('Minh Anh');

    // Act
    await userEvent.type(screen.getByLabelText('Tên nhóm'), 'Nhóm lạ');
    await userEvent.click(checkboxAt(0));
    await userEvent.click(screen.getByRole('button', { name: 'Tạo nhóm' }));

    // Assert
    expect(await screen.findByRole('alert'))
      .toHaveTextContent('Chỉ thêm được thành viên cùng nhóm với bạn');
  });

  it('should say so when the caller shares no group with anyone', async () => {
    // Arrange
    withContacts([]);

    // Act
    render(<GroupCreateModal onCreate={vi.fn()} onClose={vi.fn()} />);

    // Assert
    await waitFor(() =>
      expect(screen.getByText(/chưa cùng nhóm với ai/)).toBeInTheDocument());
  });
});
