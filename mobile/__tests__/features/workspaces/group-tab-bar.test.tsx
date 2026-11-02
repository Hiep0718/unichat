import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';

import { GroupTabBar } from '../../../src/features/workspaces/components/group-tab-bar';

import type { GroupTabSpec } from '../../../src/features/workspaces/components/group-tab-bar';

const TABS: GroupTabSpec[] = [
  { key: 'posts', label: 'Bài viết', count: 3 },
  { key: 'documents', label: 'Tệp', count: 6 },
  { key: 'members', label: 'Thành viên', count: 3 },
  { key: 'about', label: 'Giới thiệu' },
];

describe('GroupTabBar', () => {
  it('should put each count beside the name it belongs to', async () => {
    // Arrange, Act
    const { getByText } = await render(
      <GroupTabBar tabs={TABS} active="posts" onChange={jest.fn()} />,
    );

    // Assert
    expect(getByText('Tệp · 6')).toBeTruthy();
    expect(getByText('Thành viên · 3')).toBeTruthy();
  });

  it('should never number the description tab', async () => {
    // Arrange, Act: mô tả thì có hoặc không, nên một con số ở đó nói ít hơn
    // chính chữ đó.
    const { getByText } = await render(
      <GroupTabBar tabs={TABS} active="posts" onChange={jest.fn()} />,
    );

    // Assert
    expect(getByText('Giới thiệu')).toBeTruthy();
  });

  it('should leave an empty tab unnumbered', async () => {
    // Arrange: "Tệp · 0" là cách nặng nề hơn để nói điều mà mục rỗng tự nói.
    const tabs: GroupTabSpec[] = [
      { key: 'documents', label: 'Tệp', count: 0 },
      { key: 'about', label: 'Giới thiệu' },
    ];

    // Act
    const { getByText, queryByText } = await render(
      <GroupTabBar tabs={tabs} active="documents" onChange={jest.fn()} />,
    );

    // Assert
    expect(getByText('Tệp')).toBeTruthy();
    expect(queryByText('Tệp · 0')).toBeNull();
  });

  it('should name every tab before the counts have arrived', async () => {
    // Arrange: số đếm tới cùng với truy vấn nhóm, và tên không được chờ nó.
    const tabs: GroupTabSpec[] = [
      { key: 'posts', label: 'Bài viết', count: undefined },
      { key: 'documents', label: 'Tệp', count: undefined },
    ];

    // Act
    const { getByText } = await render(
      <GroupTabBar tabs={tabs} active="posts" onChange={jest.fn()} />,
    );

    // Assert
    expect(getByText('Bài viết')).toBeTruthy();
    expect(getByText('Tệp')).toBeTruthy();
  });

  it('should report which tab the reader asked for', async () => {
    // Arrange
    const onChange = jest.fn();
    const { getByText } = await render(
      <GroupTabBar tabs={TABS} active="posts" onChange={onChange} />,
    );

    // Act
    await fireEvent.press(getByText('Thành viên · 3'));

    // Assert
    expect(onChange).toHaveBeenCalledWith('members');
  });

  it('should mark the active tab for assistive technology', async () => {
    // Arrange, Act
    const { getByLabelText } = await render(
      <GroupTabBar tabs={TABS} active="documents" onChange={jest.fn()} />,
    );

    // Assert
    expect(getByLabelText('Tệp').props.accessibilityState.selected).toBe(true);
    expect(getByLabelText('Bài viết').props.accessibilityState.selected).toBe(false);
  });
});
