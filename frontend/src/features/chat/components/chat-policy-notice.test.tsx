import { cleanup, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it } from 'vitest';
import { ChatPolicyNotice } from './chat-policy-notice';

afterEach(cleanup);

describe('ChatPolicyNotice', () => {
  it('should direct an owner to the explicit AI permission setting', () => {
    render(<MemoryRouter><ChatPolicyNotice workspaceId="workspace" isOwner /></MemoryRouter>);
    expect(screen.getByRole('heading', { name: 'AI đang tắt cho Workspace này' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Mở cài đặt AI & Quyền riêng tư' }))
      .toHaveAttribute('href', '/workspaces/workspace/settings?tab=privacy');
    expect(screen.getByRole('alert')).toHaveTextContent('Chế độ riêng tư chỉ giới hạn người có thể truy cập Workspace.');
    expect(screen.getByRole('alert')).toHaveTextContent('nhà cung cấp AI đám mây');
  });
  it('should ask other members to contact the owner', () => {
    render(<MemoryRouter><ChatPolicyNotice workspaceId="workspace" isOwner={false} /></MemoryRouter>);
    expect(screen.getByRole('alert')).toHaveTextContent('liên hệ chủ Workspace');
    expect(screen.queryByRole('link')).not.toBeInTheDocument();
  });
});
