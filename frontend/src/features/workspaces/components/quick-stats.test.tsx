import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';

import { QuickStats } from './quick-stats';
import { summariseWorkspaces } from '../workspace-totals';
import type { WorkspaceDto } from '../workspace-schema';

// Vitest `globals` tắt toàn dự án nên RTL không tự gắn auto-cleanup.
afterEach(cleanup);

/** Dựng một WorkspaceDto chỉ với các trường mà phép cộng dồn thật sự đọc. */
function workspace(documentCount: number, memberCount: number): WorkspaceDto {
  return {
    id: '11111111-1111-4111-8111-111111111111',
    ownerId: '22222222-2222-4222-8222-222222222222',
    name: 'Mongodb',
    description: '',
    visibility: 'PUBLIC',
    cloudAllowed: false,
    documentCount,
    memberCount,
    recentPostCount: 0,
    postCount: 0,
    faces: [],
    topics: [],
    hasCover: false,
    version: 0,
    createdAt: '2026-10-01T00:00:00Z',
    updatedAt: '2026-10-01T00:00:00Z',
    userRole: 'OWNER',
  };
}

describe('summariseWorkspaces', () => {
  it('should count the spaces and add up their documents and members', () => {
    // Arrange
    const workspaces = [workspace(6, 2), workspace(33, 2), workspace(1, 3)];

    // Act
    const [spaces, documents, members] = summariseWorkspaces(workspaces);

    // Assert
    expect(spaces!.value).toBe(3);
    expect(documents!.value).toBe(40);
    expect(members!.value).toBe(7);
  });

  it('should report zeroes rather than blanks for a new account', () => {
    // Arrange, Act: một tài khoản chưa có không gian nào vẫn phải thấy ba ô,
    // nếu không thì màn hình trống trông như đang lỗi tải.
    const stats = summariseWorkspaces([]);

    // Assert
    expect(stats).toHaveLength(3);
    expect(stats.every((stat) => stat.value === 0)).toBe(true);
  });

  it('should keep the three counts in the order the screen reads them', () => {
    // Arrange, Act
    const labels = summariseWorkspaces([]).map((stat) => stat.label);

    // Assert
    expect(labels).toEqual(['Workspace', 'Tài liệu', 'Thành viên']);
  });
});

describe('QuickStats', () => {
  it('should show each count beside its own label', () => {
    // Arrange, Act
    render(<QuickStats workspaces={[workspace(6, 2), workspace(33, 2)]} />);

    // Assert
    expect(screen.getByText('2')).toBeInTheDocument();
    expect(screen.getByText('39')).toBeInTheDocument();
    expect(screen.getByText('Tài liệu')).toBeInTheDocument();
  });

  it('should draw the counts without icons', () => {
    // Arrange, Act: một biểu tượng trong ô vuông nhuộm màu là thứ bộ phong
    // cách cấm, và ô "Thành viên" từng lấy màu lỗi nên một con số bình
    // thường được sơn như cảnh báo. Test giữ cho chúng không quay lại.
    const { container } = render(<QuickStats workspaces={[workspace(6, 2)]} />);

    // Assert
    expect(container.querySelector('.quick-stats__icon-wrap')).toBeNull();
    expect(container.querySelector('.material-symbols-outlined')).toBeNull();
  });

  it('should name itself for a reader who cannot see the layout', () => {
    // Arrange, Act
    render(<QuickStats workspaces={[]} />);

    // Assert
    expect(screen.getByRole('region', { name: 'Thống kê nhanh' })).toBeInTheDocument();
  });
});
