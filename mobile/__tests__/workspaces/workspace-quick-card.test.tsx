import React from 'react';
import { render } from '@testing-library/react-native';

import { WorkspaceQuickCard } from '../../src/features/workspaces/components/workspace-quick-card';

import type { WorkspaceItem } from '../../src/features/workspaces/workspace-types';

const WORKSPACE = {
  id: 'ws-1',
  name: 'Lập trình hướng đối tượng',
  visibility: 'PUBLIC',
  documentCount: 33,
  memberCount: 4,
  updatedAt: new Date(Date.now() - 3 * 3_600_000).toISOString(),
} as unknown as WorkspaceItem;

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

describe('WorkspaceQuickCard', () => {
  it('wears the same picture the group wears everywhere else', async () => {
    // Thẻ này từng vẽ một mảng màu phẳng mang chữ cái, nên cùng một nhóm
    // trông như hai nhóm khác nhau ở hai chỗ trên cùng một màn hình.
    const { toJSON } = await render(
      <WorkspaceQuickCard workspace={WORKSPACE} onPress={noop} />,
    );

    expect(countImages(toJSON())).toBeGreaterThan(0);
  });

  it('writes the name and the counts over the picture', async () => {
    const { getByText } = await render(
      <WorkspaceQuickCard workspace={WORKSPACE} onPress={noop} />,
    );

    expect(getByText('Lập trình hướng đối tượng')).toBeTruthy();
    expect(getByText('33 tài liệu · 3 giờ trước')).toBeTruthy();
  });

  it('names the visibility so a public group is recognisable', async () => {
    const { getByText } = await render(
      <WorkspaceQuickCard workspace={WORKSPACE} onPress={noop} />,
    );

    expect(getByText('Công khai')).toBeTruthy();
  });

  it('marks only the card told it is the latest', async () => {
    const plain = await render(<WorkspaceQuickCard workspace={WORKSPACE} onPress={noop} />);
    expect(plain.queryByText('Mới nhất')).toBeNull();

    const marked = await render(
      <WorkspaceQuickCard workspace={WORKSPACE} latest onPress={noop} />,
    );
    expect(marked.getByText('Mới nhất')).toBeTruthy();
  });

  it('carries an accessible name naming the group it opens', async () => {
    const { getByLabelText } = await render(
      <WorkspaceQuickCard workspace={WORKSPACE} onPress={noop} />,
    );

    expect(getByLabelText('Mở nhóm Lập trình hướng đối tượng')).toBeTruthy();
  });
});
