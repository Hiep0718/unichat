jest.mock('react-test-renderer/package.json', () => ({
  version: '19.2.3',
}));


import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { UCLiquidGlassTabBar, LiquidGlassTabBarProps } from '../../src/components/uc-liquid-glass-tab-bar';
import * as Haptics from 'expo-haptics';


jest.mock('expo-blur', () => {
  const { View } = require('react-native');
  return {
    BlurView: (props: any) => <View testID="mock-blur-view" {...props} />,
  };
});

jest.mock('expo-haptics', () => ({
  impactAsync: jest.fn(),
  ImpactFeedbackStyle: {
    Light: 'light',
  },
}));

jest.mock('../../src/components/uc-icon', () => {
  const { View } = require('react-native');
  return {
    UCIcon: (props: any) => <View testID={`uc-icon-${props.name}`} {...props} />,
  };
});


describe('UCLiquidGlassTabBar', () => {
  const mockNavigate = jest.fn();
  const mockEmit = jest.fn().mockReturnValue({ defaultPrevented: false });

  const createProps = (activeIndex = 0, hideTabBar = false): LiquidGlassTabBarProps => {
    return {
      state: {
        index: activeIndex,
        key: 'tabs-state',
        routeNames: ['index', 'chat', 'feed', 'account'],
        routes: [
          { key: 'index-key', name: 'index', params: undefined },
          { key: 'chat-key', name: 'chat', params: undefined },
          { key: 'feed-key', name: 'feed', params: undefined },
          { key: 'account-key', name: 'account', params: undefined },
        ],
        type: 'tab',
        stale: false,
        history: [],
      } as any,
      descriptors: {
        'index-key': {
          options: {
            title: 'Workspace',
            tabBarStyle: hideTabBar ? { display: 'none' } : undefined,
          },
        } as any,
        'chat-key': {
          options: {
            title: 'Hội thoại',
          },
        } as any,
        'feed-key': {
          options: {
            title: 'Bảng tin',
            tabBarBadge: 3,
          },
        } as any,
        'account-key': {
          options: {
            title: 'Tôi',
          },
        } as any,
      },
      navigation: {
        navigate: mockNavigate,
        emit: mockEmit,
      } as any,
      insets: {
        top: 47,
        bottom: 34,
        left: 0,
        right: 0,
      },
    };
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders all 4 tabs with proper labels and badge', () => {
    const props = createProps(0);
    const { getByText } = render(<UCLiquidGlassTabBar {...props} />);

    expect(getByText('Workspace')).toBeTruthy();
    expect(getByText('Hội thoại')).toBeTruthy();
    expect(getByText('Bảng tin')).toBeTruthy();
    expect(getByText('Tôi')).toBeTruthy();
    expect(getByText('3')).toBeTruthy(); // Badge on feed tab
  });

  it('navigates and emits event on tab press', () => {
    const props = createProps(0);
    const { getByText } = render(<UCLiquidGlassTabBar {...props} />);

    const chatTab = getByText('Hội thoại');
    fireEvent.press(chatTab);

    expect(mockEmit).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'tabPress',
        target: 'chat-key',
        canPreventDefault: true,
      })
    );
    expect(mockNavigate).toHaveBeenCalledWith('chat');
  });

  it('triggers haptics on press', () => {
    const props = createProps(0);
    const { getByText } = render(<UCLiquidGlassTabBar {...props} />);

    fireEvent.press(getByText('Tôi'));
    expect(Haptics.impactAsync).toHaveBeenCalledWith('light');
  });

  it('returns null if screen requests tabBarStyle display: none', () => {
    const props = createProps(0, true);
    const { queryByText } = render(<UCLiquidGlassTabBar {...props} />);

    expect(queryByText('Workspace')).toBeNull();
  });
});
