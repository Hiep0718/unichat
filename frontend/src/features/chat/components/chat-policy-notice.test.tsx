import { cleanup, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it } from 'vitest';
import { ChatPolicyNotice } from './chat-policy-notice';

afterEach(cleanup);

describe('ChatPolicyNotice', () => {
  it('should direct an owner to the explicit AI permission setting', () => {
    render(<MemoryRouter><ChatPolicyNotice workspaceId="workspace" isOwner /></MemoryRouter>);
    expect(screen.getByRole('alert')).toHaveTextContent('Workspace đang tắt quyền xử lý bằng AI.');
    expect(screen.getByRole('link', { name: 'Mở cài đặt AI của Workspace' })).toHaveAttribute('href', '/workspaces/workspace/settings');
    expect(screen.getByRole('alert')).toHaveTextContent('nhà cung cấp AI');
  });
  it('should ask other members to contact the owner', () => {
    render(<MemoryRouter><ChatPolicyNotice workspaceId="workspace" isOwner={false} /></MemoryRouter>);
    expect(screen.getByRole('alert')).toHaveTextContent('liên hệ chủ sở hữu');
    expect(screen.queryByRole('link')).not.toBeInTheDocument();
  });
});
