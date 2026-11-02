import { cleanup, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { WelcomeBanner } from './welcome-banner';
import * as authContext from '../../auth/auth-context';
import type { WorkspaceDto } from '../workspace-schema';

// Vitest `globals` tắt toàn dự án nên RTL không tự gắn auto-cleanup.
afterEach(cleanup);
afterEach(() => vi.restoreAllMocks());

/** Một WorkspaceDto chỉ với các trường mà dải chào thật sự đọc. */
function workspace(over: Partial<WorkspaceDto> = {}): WorkspaceDto {
  return {
    id: '11111111-1111-4111-8111-111111111111',
    ownerId: '22222222-2222-4222-8222-222222222222',
    name: 'Mongodb',
    description: '',
    visibility: 'PUBLIC',
    cloudAllowed: false,
    documentCount: 0,
    memberCount: 1,
    recentPostCount: 0,
    postCount: 0,
    faces: [],
    topics: [],
    hasCover: false,
    version: 0,
    createdAt: '2026-10-01T00:00:00Z',
    updatedAt: '2026-10-01T00:00:00Z',
    userRole: 'OWNER',
    ...over,
  };
}

function draw(workspaces: readonly WorkspaceDto[] = []) {
  return render(
    <MemoryRouter>
      <WelcomeBanner workspaces={workspaces} />
    </MemoryRouter>,
  );
}

describe('WelcomeBanner', () => {
  beforeEach(() => {
    vi.spyOn(authContext, 'useAuth').mockReturnValue({
      user: { displayName: 'Hùng', email: 'hung@example.com' },
    } as ReturnType<typeof authContext.useAuth>);
  });

  it('should greet the member by name', async () => {
    // Arrange, Act
    draw();

    // Assert
    expect(await screen.findByRole('heading', { level: 1, name: /Hùng/ })).toBeInTheDocument();
  });

  it('should show the three counts of the account', async () => {
    // Arrange, Act
    draw([workspace({ documentCount: 6, memberCount: 2 }), workspace({ documentCount: 4 })]);

    // Assert
    expect(await screen.findByText('2')).toBeInTheDocument();
    expect(screen.getByText('10')).toBeInTheDocument();
    expect(screen.getByText('Tài liệu')).toBeInTheDocument();
  });

  it('should let a member ask a question without leaving the screen', async () => {
    // Arrange, Act: ô hỏi nhanh là việc chính mà màn hình này tồn tại vì nó.
    draw([workspace({ name: 'Mongodb' })]);

    // Assert
    expect(await screen.findByLabelText('Câu hỏi')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Hỏi/ })).toBeInTheDocument();
  });

  it('should hide the ask box for an account with no groups to ask about', async () => {
    // Arrange, Act
    draw([]);

    // Assert
    expect(screen.queryByLabelText('Câu hỏi')).not.toBeInTheDocument();
  });

});
