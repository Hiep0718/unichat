import React from 'react';
import { render } from '@testing-library/react-native';

import { WorkspaceHero } from '../../src/features/workspaces/components/workspace-hero';

/** Đếm các nút Image trong cây đã kết xuất.
 *  Bản @testing-library/react-native ở đây không có UNSAFE_getAllByType. */
function countImages(node: unknown): number {
  if (!node || typeof node !== 'object') return 0;
  const n = node as { type?: unknown; children?: unknown };
  const self = n.type === 'Image' ? 1 : 0;
  const kids = Array.isArray(n.children) ? n.children : [];
  return self + kids.reduce<number>((sum, kid) => sum + countImages(kid), 0);
}

const noop = () => undefined;

function heroProps(overrides: Record<string, unknown> = {}) {
  return {
    email: 'lan.nguyen@iuh.edu.vn',
    displayName: 'Lan Nguyễn',
    workspaceCount: 7,
    documentCount: 40,
    memberCount: 14,
    onQuickChat: noop,
    ...overrides,
  };
}

describe('WorkspaceHero', () => {
  it('renders its background artwork from a bundled asset', async () => {
    // Một require sai đường dẫn làm vỡ cả màn hình, và trước đây không test
    // nào chạm tới component này.
    const { toJSON } = await render(<WorkspaceHero {...heroProps()} />);

    expect(countImages(toJSON())).toBeGreaterThan(0);
  });

  it('shows the three counts it was given', async () => {
    const { getByText } = await render(<WorkspaceHero {...heroProps()} />);

    expect(getByText('7')).toBeTruthy();
    expect(getByText('40')).toBeTruthy();
    expect(getByText('14')).toBeTruthy();
  });

  it('keeps every counter labelled for an account with nothing in it', async () => {
    const { getByText } = await render(
      <WorkspaceHero {...heroProps({ workspaceCount: 0, documentCount: 0, memberCount: 0 })} />,
    );

    expect(getByText('Workspace')).toBeTruthy();
    expect(getByText('Tài liệu')).toBeTruthy();
    expect(getByText('Thành viên')).toBeTruthy();
  });

  it('falls back to the email handle when no display name is set', async () => {
    const { getByText } = await render(
      <WorkspaceHero {...heroProps({ displayName: undefined })} />,
    );

    expect(getByText(/lan\.nguyen/)).toBeTruthy();
  });
});
