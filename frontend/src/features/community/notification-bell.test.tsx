import { cleanup, render, screen, fireEvent, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { NotificationBell } from './notification-bell';
import * as communityApi from './community-api';

afterEach(cleanup);

vi.mock('./community-api', () => ({
  fetchNotifications: vi.fn(),
  fetchUnreadCount: vi.fn(),
  markNotificationRead: vi.fn(),
  markAllNotificationsRead: vi.fn(),
}));

describe('NotificationBell', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(communityApi.fetchUnreadCount).mockResolvedValue({ unreadCount: 3 });
    vi.mocked(communityApi.fetchNotifications).mockResolvedValue([
      {
        id: 'notif-1',
        type: 'COMMUNITY_MENTION',
        workspaceId: 'ws-1',
        payload: '{}',
        isRead: false,
        createdAt: new Date().toISOString(),
      },
    ]);
  });

  it('renders the bell icon and the "Thông báo" text label', async () => {
    render(<NotificationBell />);

    // Text label exists and matches other nav rail items
    expect(screen.getByText('Thông báo')).toBeInTheDocument();

    // Bell icon exists
    expect(screen.getByText('notifications')).toBeInTheDocument();

    // Badge with unread count exists
    const badge = await screen.findByText('3');
    expect(badge).toBeInTheDocument();
  });

  it('toggles dropdown and notifies onOpenChange callback', async () => {
    const handleOpenChange = vi.fn();
    render(<NotificationBell onOpenChange={handleOpenChange} />);

    const button = screen.getByRole('button', { name: /Thông báo/i });

    // Open dropdown
    fireEvent.click(button);
    expect(handleOpenChange).toHaveBeenCalledWith(true);

    // Dropdown content appears
    await waitFor(() => {
      expect(screen.getByText('Bạn được nhắc đến trong chat')).toBeInTheDocument();
    });

    // Close dropdown on second click
    fireEvent.click(button);
    expect(handleOpenChange).toHaveBeenCalledWith(false);
  });

  it('closes dropdown when Escape key is pressed', async () => {
    const handleOpenChange = vi.fn();
    render(<NotificationBell onOpenChange={handleOpenChange} />);

    const button = screen.getByRole('button', { name: /Thông báo/i });
    fireEvent.click(button);

    await waitFor(() => {
      expect(screen.getByText('Bạn được nhắc đến trong chat')).toBeInTheDocument();
    });

    fireEvent.keyDown(window, { key: 'Escape' });
    expect(handleOpenChange).toHaveBeenCalledWith(false);
  });
});
