import { cleanup, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { WorkspaceCover } from './workspace-cover';
import * as apiClient from '../../../lib/api-client';

// Vitest `globals` is disabled project-wide, so RTL auto-cleanup is not installed.
afterEach(cleanup);
afterEach(() => vi.restoreAllMocks());

URL.createObjectURL = vi.fn(() => 'blob:mock-cover');
URL.revokeObjectURL = vi.fn();

const ID_A = '11111111-1111-4111-8111-111111111111';
const ID_B = '22222222-2222-4222-8222-222222222222';
// The cover cache is module-level and survives between tests, so anything that
// actually fetches uses an id of its own rather than reusing a cached one.
const ID_FETCHED = '33333333-3333-4333-8333-333333333333';
const ID_FAILED = '44444444-4444-4444-8444-444444444444';

describe('WorkspaceCover', () => {
  it('should draw a gradient for a group that uploaded nothing', () => {
    // Arrange
    const fetchBlob = vi.spyOn(apiClient, 'fetchBlob');

    // Act
    const { container } = render(
      <WorkspaceCover workspaceId={ID_A} name="Mongodb" hasCover={false} />,
    );

    // Assert: no request at all, and a visible mark rather than a grey box.
    expect(fetchBlob).not.toHaveBeenCalled();
    const cover = container.querySelector('.workspace-cover') as HTMLElement;
    expect(cover.style.background).toContain('linear-gradient');
    expect(screen.getByText('M')).toBeInTheDocument();
  });

  it('should give two different groups two different gradients', () => {
    // Arrange and Act: cards that all look alike are the problem being solved.
    const { container: first } = render(
      <WorkspaceCover workspaceId={ID_A} name="Mongodb" hasCover={false} />,
    );
    const { container: second } = render(
      <WorkspaceCover workspaceId={ID_B} name="Quy chế IUH" hasCover={false} />,
    );

    // Assert
    const a = (first.querySelector('.workspace-cover') as HTMLElement).style.background;
    const b = (second.querySelector('.workspace-cover') as HTMLElement).style.background;
    expect(a).not.toEqual(b);
  });

  it('should give the same group the same gradient on every render', () => {
    // Arrange and Act: the colour must not shuffle between the quick-access
    // row and the list below it, which render the same group twice.
    const { container: first } = render(
      <WorkspaceCover workspaceId={ID_A} name="Mongodb" hasCover={false} />,
    );
    const { container: second } = render(
      <WorkspaceCover workspaceId={ID_A} name="Mongodb" hasCover={false} />,
    );

    // Assert
    const a = (first.querySelector('.workspace-cover') as HTMLElement).style.background;
    const b = (second.querySelector('.workspace-cover') as HTMLElement).style.background;
    expect(a).toEqual(b);
  });

  it('should show the uploaded picture when the group has one', async () => {
    // Arrange
    vi.spyOn(apiClient, 'fetchBlob').mockResolvedValue(
      new Blob(['jpeg'], { type: 'image/jpeg' }),
    );

    // Act
    const { container } = render(
      <WorkspaceCover workspaceId={ID_FETCHED} name="Mongodb" hasCover />,
    );

    // Assert
    await waitFor(() =>
      expect(container.querySelector('.workspace-cover__image')).toBeInTheDocument(),
    );
  });

  it('should fall back to the gradient when the picture cannot be read', async () => {
    // Arrange: a failed fetch must not leave an empty grey band.
    const fetchBlob = vi
      .spyOn(apiClient, 'fetchBlob')
      .mockRejectedValue(new Error('404'));

    // Act
    const { container } = render(
      <WorkspaceCover workspaceId={ID_FAILED} name="Mongodb" hasCover />,
    );

    // Assert: wait for the request to have settled before judging what is on
    // screen, otherwise this only observes the gradient shown while loading.
    await waitFor(() => expect(fetchBlob).toHaveBeenCalled());
    await waitFor(() => {
      expect(container.querySelector('.workspace-cover__image')).not.toBeInTheDocument();
      expect(screen.getByText('M')).toBeInTheDocument();
    });
  });
});
