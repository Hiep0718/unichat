import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import * as Haptics from 'expo-haptics';

import { UCDockTabBar, dockIconFor } from '../../src/components/uc-dock-tab-bar';

import type { DockTabBarProps } from '../../src/components/uc-dock-tab-bar';

jest.mock('expo-haptics', () => ({
  impactAsync: jest.fn(),
  ImpactFeedbackStyle: { Light: 'light' },
}));

jest.mock('../../src/components/uc-icon', () => {
  const { View } = require('react-native');
  return { UCIcon: (props: { name: string }) => <View testID={`uc-icon-${props.name}`} /> };
});

const ROUTES = [
  { name: 'feed', title: 'Bảng tin' },
  { name: 'index', title: 'Nhóm' },
  { name: 'chat', title: 'Hỏi AI' },
  { name: 'messages', title: 'Tin nhắn' },
  { name: 'account', title: 'Tài khoản' },
];

const navigateToTab = jest.fn();
const emit = jest.fn();

function createProps(activeIndex = 0, overrides: Record<string, object> = {}): DockTabBarProps {
  const descriptors = Object.fromEntries(
    ROUTES.map((route) => [`${route.name}-key`, { options: { title: route.title, ...overrides[route.name] } }]),
  );
  return {
    state: {
      index: activeIndex,
      key: 'tabs',
      routeNames: ROUTES.map((route) => route.name),
      routes: ROUTES.map((route) => ({ key: `${route.name}-key`, name: route.name })),
      type: 'tab',
      stale: false,
      history: [],
    },
    descriptors,
    emitter: { emit },
    navigateToTab,
    insets: { top: 47, bottom: 34, left: 0, right: 0 },
  } as unknown as DockTabBarProps;
}

describe('UCDockTabBar', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    emit.mockReturnValue({ defaultPrevented: false });
  });

  it('shows the four labelled tabs with the AI button between Nhóm and Tin nhắn', async () => {
    const { getByText, getByTestId, queryByText } = await render(<UCDockTabBar {...createProps()} />);

    ['Bảng tin', 'Nhóm', 'Tin nhắn', 'Tài khoản'].forEach((label) => expect(getByText(label)).toBeTruthy());
    expect(getByTestId('dock-ai-button')).toBeTruthy();
    expect(queryByText('Hỏi AI')).toBeNull();
    expect(queryByText('Hội thoại')).toBeNull();
  });

  it('navigates to the AI screen when the centre button is pressed', async () => {
    const { getByTestId } = await render(<UCDockTabBar {...createProps(0)} />);

    await fireEvent.press(getByTestId('dock-ai-button'));

    expect(emit).toHaveBeenCalledWith({ type: 'tabPress', target: 'chat-key', canPreventDefault: true });
    expect(navigateToTab).toHaveBeenCalledWith('chat-key');
  });

  it('does not navigate again when the focused tab is pressed', async () => {
    const { getByText } = await render(<UCDockTabBar {...createProps(3)} />);

    await fireEvent.press(getByText('Tin nhắn'));

    expect(emit).toHaveBeenCalled();
    expect(navigateToTab).not.toHaveBeenCalled();
  });

  it('respects a listener that prevents the default navigation', async () => {
    emit.mockReturnValue({ defaultPrevented: true });
    const { getByText } = await render(<UCDockTabBar {...createProps(0)} />);

    await fireEvent.press(getByText('Tài khoản'));

    expect(navigateToTab).not.toHaveBeenCalled();
  });

  it('shows the unread badge on the messages tab', async () => {
    const props = createProps(0, { messages: { tabBarBadge: '4' } });
    const { getByText } = await render(<UCDockTabBar {...props} />);

    expect(getByText('4')).toBeTruthy();
  });

  it('gives light haptic feedback on press', async () => {
    const { getByText } = await render(<UCDockTabBar {...createProps(0)} />);

    await fireEvent.press(getByText('Nhóm'));

    expect(Haptics.impactAsync).toHaveBeenCalledWith('light');
  });

  it('renders nothing when the focused screen hides the tab bar', async () => {
    const props = createProps(0, { feed: { tabBarStyle: { display: 'none' } } });
    const { queryByText } = await render(<UCDockTabBar {...props} />);

    expect(queryByText('Bảng tin')).toBeNull();
  });

  it('switches the messages and account icons to their filled form when focused', () => {
    expect(dockIconFor('messages', true)).toBe('chat-bubble');
    expect(dockIconFor('messages', false)).toBe('chat-bubble-outline');
    expect(dockIconFor('account', true)).toBe('person');
    expect(dockIconFor('unknown', false)).toBe('folder');
  });
});
